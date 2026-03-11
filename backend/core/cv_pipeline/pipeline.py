"""Main CV analysis pipeline.

Orchestrates: ingest → page-split → analyze (parallel) → aggregate → persist.
Yields PipelineEvent at each stage and per-page for real-time tracking.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from pathlib import Path

from backend.agents.cv_analyzers.agent import analyze_cv_page
from backend.core.cv_pipeline.components.aggregator import aggregate_page_results
from backend.core.cv_pipeline.components.ingestor import (
    extract_page_contents,
    ingest_cv,
)
from backend.core.cv_pipeline.db_persist import persist_cv_result
from backend.core.cv_pipeline.job_tracker import (
    build_pipeline_event,
    emit_pipeline_event,
    save_job_state,
)
from backend.core.cv_pipeline.schemas import (
    JobState,
    JobStatus,
    PageAnalysis,
    PipelineEvent,
)

logger = logging.getLogger(__name__)


async def _analyze_single_page(
    page_number: int,
    text: str,
    job: JobState,
    events: list[PipelineEvent],
) -> PageAnalysis:
    """Analyze one page and collect completion events."""
    result = await analyze_cv_page(text)

    # Safe: asyncio is single-threaded, += happens between awaits.
    job.analyzed_pages += 1
    event = await emit_pipeline_event(
        job,
        JobStatus.ANALYZING,
        f"Page {page_number}/{job.total_pages} complete",
        page=page_number,
    )
    events.append(event)
    return result


async def run_cv_pipeline(
    job: JobState,
) -> AsyncGenerator[PipelineEvent, None]:
    """Run the full CV analysis pipeline, yielding progress events.

    Page analysis runs in parallel via asyncio.gather for speed.
    Each yield is a PipelineEvent published to Redis for SSE/WebSocket.
    """
    file_path = Path(job.file_path)

    try:
        # --- Stage 1: Ingestion ---
        yield await emit_pipeline_event(job, JobStatus.INGESTING, "Ingesting document")

        documents = await ingest_cv(file_path)
        page_contents = await extract_page_contents(documents)
        job.total_pages = len(page_contents)

        yield await emit_pipeline_event(
            job,
            JobStatus.INGESTING,
            f"Document ingested — {job.total_pages} pages found",
        )

        # --- Stage 2: Parallel page analysis ---
        yield await emit_pipeline_event(
            job,
            JobStatus.ANALYZING,
            f"Analyzing {job.total_pages} pages in parallel",
        )

        completion_events: list[PipelineEvent] = []
        sorted_pages = sorted(page_contents.items())

        tasks = [
            _analyze_single_page(page_num, text, job, completion_events)
            for page_num, text in sorted_pages
        ]
        page_results: list[PageAnalysis] = await asyncio.gather(*tasks)

        for event in sorted(completion_events, key=lambda e: e.page or 0):
            yield event

        # --- Stage 3: Aggregation ---
        yield await emit_pipeline_event(job, JobStatus.AGGREGATING, "Aggregating results")

        final_result = await aggregate_page_results(page_results)
        job.result = final_result

        # --- Stage 4: Persist to DB (with hash dedup) ---
        yield await emit_pipeline_event(job, JobStatus.AGGREGATING, "Saving to database")

        version_id, is_new = await persist_cv_result(
            cv_upload_id=job.cv_upload_id,
            result=final_result,
        )

        # --- Done ---
        job.status = JobStatus.COMPLETED
        await save_job_state(job)
        detail = "New version saved" if is_new else "Duplicate — skipped"
        yield build_pipeline_event(job, JobStatus.COMPLETED, "Analysis complete", detail=detail)

    except (FileNotFoundError, ValueError, OSError, RuntimeError) as exc:
        logger.exception("CV pipeline failed for job %s", job.job_id)
        job.status = JobStatus.FAILED
        job.error = str(exc)
        await save_job_state(job)
        yield build_pipeline_event(
            job, JobStatus.FAILED, "Pipeline failed", detail=str(exc)
        )
        raise
