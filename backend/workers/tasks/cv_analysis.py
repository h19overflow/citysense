"""Celery task for CV analysis pipeline.

Bridges the async CV pipeline into a Celery task via asyncio.run().
The pipeline itself handles Redis event publishing and DB persistence.
"""

from __future__ import annotations

import asyncio
import logging

import redis
from sqlalchemy.exc import OperationalError as DBOperationalError

from backend.workers.celery_app import app

logger = logging.getLogger(__name__)

# Transient failures worth retrying (network, broker, DB lock)
RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    redis.RedisError,
    DBOperationalError,
    OSError,
)


@app.task(
    bind=True,
    name="cv_analysis.run",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def run_cv_analysis(self, job_state_dict: dict) -> dict:
    """Execute the full CV analysis pipeline as a Celery task.

    Args:
        job_state_dict: Serialized JobState dict with keys:
            job_id, citizen_id, cv_upload_id, file_path, status.

    Returns:
        Final JobState dict after pipeline completes or fails.
    """
    from backend.core.cv_pipeline.schemas import JobState

    job = JobState.model_validate(job_state_dict)
    logger.info("Celery task started for job %s", job.job_id)

    try:
        result = asyncio.run(_execute_pipeline(job))
        return result.model_dump(mode="json")
    except RETRYABLE_EXCEPTIONS as exc:
        logger.warning("Retryable failure for job %s: %s", job.job_id, exc)
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception(
            "[CeleryTask:%s] Non-retryable failure — exception type=%s, message=%s",
            job.job_id,
            type(exc).__name__,
            exc,
        )
        raise


async def _execute_pipeline(job) -> "JobState":
    """Run the async pipeline, draining all events."""
    from backend.core.cv_pipeline.job_tracker import save_job_state
    from backend.core.cv_pipeline.pipeline import run_cv_pipeline

    await save_job_state(job)

    async for event in run_cv_pipeline(job):
        logger.info(
            "[%s] %s — %d%%",
            event.status,
            event.stage,
            event.progress_pct,
        )

    logger.info("Job %s finished with status: %s", job.job_id, job.status)
    return job
