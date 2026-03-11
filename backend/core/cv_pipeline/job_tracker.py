"""Redis-backed job state management for CV pipeline.

Stores job state as a JSON hash in Redis, keyed by job_id.
Publishes progress events to a Redis pub/sub channel so any
subscriber (SSE endpoint, WebSocket) can stream updates.
"""

from __future__ import annotations

import asyncio
import json
import logging

import redis

from backend.core.cv_pipeline.schemas import JobState, JobStatus, PipelineEvent
from backend.core.redis_client import cache

logger = logging.getLogger(__name__)

REDIS_KEY_PREFIX = "cv_job:"
REDIS_CHANNEL_PREFIX = "cv_progress:"
JOB_TTL_SECONDS = 3600  # 1 hour


def _job_key(job_id: str) -> str:
    return f"{REDIS_KEY_PREFIX}{job_id}"


def _channel_key(job_id: str) -> str:
    return f"{REDIS_CHANNEL_PREFIX}{job_id}"


async def save_job_state(state: JobState) -> None:
    """Persist job state to Redis (offloaded to thread pool)."""
    await asyncio.to_thread(
        cache.store,
        _job_key(state.job_id),
        state.model_dump(mode="json"),
        JOB_TTL_SECONDS,
    )


async def load_job_state(job_id: str) -> JobState | None:
    """Load job state from Redis. Returns None if missing."""
    data = await asyncio.to_thread(cache.fetch, _job_key(job_id))
    if data is None:
        return None
    return JobState.model_validate(data)


async def publish_event(event: PipelineEvent) -> None:
    """Publish a progress event to the job's Redis pub/sub channel."""
    channel = _channel_key(event.job_id)
    payload = json.dumps(event.model_dump(mode="json"))

    if not cache.is_available():
        logger.debug("Redis unavailable, skipping event publish: %s", event.stage)
        return

    try:
        await asyncio.to_thread(cache.publish, channel, payload)
    except redis.RedisError:
        logger.warning("Failed to publish event for job %s", event.job_id)


async def delete_job_state(job_id: str) -> None:
    """Remove job state from Redis."""
    await asyncio.to_thread(cache.delete, _job_key(job_id))


async def emit_pipeline_event(
    job: JobState,
    status: JobStatus,
    stage: str,
    *,
    page: int | None = None,
    detail: str = "",
) -> PipelineEvent:
    """Build an event, update job state, persist to Redis, and publish."""
    job.status = status
    event = build_pipeline_event(job, status, stage, page=page, detail=detail)
    await save_job_state(job)
    await publish_event(event)
    return event


def build_pipeline_event(
    job: JobState,
    status: JobStatus,
    stage: str,
    *,
    page: int | None = None,
    detail: str = "",
) -> PipelineEvent:
    """Construct a PipelineEvent from current job state."""
    return PipelineEvent(
        job_id=job.job_id,
        status=status,
        stage=stage,
        page=page,
        total_pages=job.total_pages or None,
        detail=detail,
        progress_pct=compute_progress(
            status, job.analyzed_pages, max(job.total_pages, 1)
        ),
    )


def compute_progress(
    status: JobStatus,
    analyzed_pages: int = 0,
    total_pages: int = 1,
) -> int:
    """Compute overall progress percentage (0-100)."""
    stage_weights = {
        JobStatus.QUEUED: 0,
        JobStatus.INGESTING: 10,
        JobStatus.ANALYZING: 20,
        JobStatus.AGGREGATING: 90,
        JobStatus.COMPLETED: 100,
        JobStatus.FAILED: 0,
    }

    if status == JobStatus.ANALYZING and total_pages > 0:
        base = stage_weights[JobStatus.ANALYZING]
        ceiling = stage_weights[JobStatus.AGGREGATING]
        page_progress = analyzed_pages / total_pages
        return int(base + (ceiling - base) * page_progress)

    return stage_weights.get(status, 0)
