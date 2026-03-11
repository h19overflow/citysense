"""Main CV analysis pipeline.

Orchestrates: ingest → page-split → analyze (parallel) → aggregate → persist.
Yields PipelineEvent at each stage and per-page for real-time tracking.
"""

from __future__ import annotations

import asyncio
import logging
import os
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
    publish_event,
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


def _resolve_file_path(stored_path: str) -> Path:
    """Resolve the stored file path to the actual location on this host.

    When the Celery worker runs inside Docker, CV_UPLOAD_DIR is set to the
    container-side mount (e.g. /app/data/cv_uploads). We use just the filename
    from the stored path and re-anchor it to CV_UPLOAD_DIR so the file can be
    found regardless of where the stored absolute path was written.
    """
    upload_dir = os.environ.get("CV_UPLOAD_DIR")
    if upload_dir:
        # stored_path may be a Windows path (e.g. C:\...\file.pdf) running on Linux.
        # Split on both separators to reliably extract just the filename.
        filename = stored_path.replace("\\", "/").split("/")[-1]
        resolved = Path(upload_dir) / filename
        logger.info("Resolved file path: %s → %s", stored_path, resolved)
        return resolved
    return Path(stored_path)


async def run_cv_pipeline(
    job: JobState,
) -> AsyncGenerator[PipelineEvent, None]:
    """Run the full CV analysis pipeline, yielding progress events.

    Page analysis runs in parallel via asyncio.gather for speed.
    Each yield is a PipelineEvent published to Redis for SSE/WebSocket.
    """
    file_path = _resolve_file_path(job.file_path)

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
        logger.info(
            "[Pipeline:%s] Pipeline complete (%s) — publishing COMPLETED event to Redis pub/sub",
            job.job_id,
            detail,
        )
        completed_event = await emit_pipeline_event(
            job, JobStatus.COMPLETED, "Analysis complete", detail=detail
        )
        yield completed_event

    except Exception as exc:
        exc_type = type(exc).__name__
        logger.exception(
            "[Pipeline:%s] Pipeline failed — exception type=%s, message=%s",
            job.job_id,
            exc_type,
            exc,
        )
        job.status = JobStatus.FAILED
        job.error = f"{exc_type}: {exc}"
        await save_job_state(job)
        await publish_event(
            build_pipeline_event(job, JobStatus.FAILED, "Pipeline failed", detail=job.error)
        )
        yield build_pipeline_event(
            job, JobStatus.FAILED, "Pipeline failed", detail=job.error
        )
        raise
