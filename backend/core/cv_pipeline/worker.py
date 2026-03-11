"""Background worker to run CV pipeline jobs.

Accepts a JobState, executes the pipeline, and drains all events.
Designed to be called from a BackgroundTask or task queue.
"""

from __future__ import annotations

import logging
import uuid

from backend.core.cv_pipeline.job_tracker import save_job_state
from backend.core.cv_pipeline.pipeline import run_cv_pipeline
from backend.core.cv_pipeline.schemas import JobState, JobStatus

logger = logging.getLogger(__name__)


def create_job(
    citizen_id: str,
    cv_upload_id: str,
    file_path: str,
) -> JobState:
    """Create a new queued job ready for submission."""
    return JobState(
        job_id=str(uuid.uuid4()),
        citizen_id=citizen_id,
        cv_upload_id=cv_upload_id,
        file_path=file_path,
        status=JobStatus.QUEUED,
    )


async def execute_job(job: JobState) -> JobState:
    """Run the pipeline to completion, draining all events.

    Args:
        job: A queued JobState (from create_job).

    Returns:
        The final JobState after pipeline completes or fails.
    """
    await save_job_state(job)
    logger.info("Starting CV pipeline job %s", job.job_id)

    async for event in run_cv_pipeline(job):
        logger.info(
            "[%s] %s — %d%%",
            event.status,
            event.stage,
            event.progress_pct,
        )

    logger.info("Job %s finished with status: %s", job.job_id, job.status)
    return job
