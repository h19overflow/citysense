"""Job creation and submission for the CV pipeline.

Creates JobState instances and submits them to the Celery task queue.
The actual pipeline execution happens in backend.workers.tasks.cv_analysis.
"""

from __future__ import annotations

import logging
import uuid

from backend.core.cv_pipeline.job_tracker import save_job_state
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


async def submit_job(job: JobState) -> str:
    """Save job state to Redis and dispatch to Celery.

    Args:
        job: A queued JobState (from create_job).

    Returns:
        The Celery task ID for tracking.
    """
    await save_job_state(job)

    from backend.workers.tasks.cv_analysis import run_cv_analysis

    celery_result = run_cv_analysis.delay(job.model_dump(mode="json"))
    logger.info(
        "Dispatched CV analysis job %s as Celery task %s",
        job.job_id,
        celery_result.id,
    )
    return celery_result.id
