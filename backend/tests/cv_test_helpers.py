"""Shared helpers and fixtures for CV API tests.

Imported by test_cv_api.py and test_cv_job_status.py.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.core.cv_pipeline.schemas import CVAnalysisResult, JobState, JobStatus

FAKE_JOB_ID = "job-abc-123"
FAKE_CV_UPLOAD_ID = "upload-xyz-456"
FAKE_CITIZEN_ID = "citizen-111"
VALID_PDF = ("resume.pdf", b"fake pdf content", "application/pdf")


@pytest.fixture()
def cv_client() -> TestClient:
    """TestClient for a minimal FastAPI app with only the CV router mounted."""
    from backend.api.routers.cv import router
    app = FastAPI()
    app.include_router(router, prefix="/api")
    return TestClient(app, raise_server_exceptions=False)


def make_job_state(
    status: JobStatus = JobStatus.QUEUED,
    total_pages: int = 0,
    analyzed_pages: int = 0,
    error: str = "",
    result: CVAnalysisResult | None = None,
) -> JobState:
    """Build a JobState for testing with sensible defaults."""
    return JobState(
        job_id=FAKE_JOB_ID, citizen_id=FAKE_CITIZEN_ID, cv_upload_id=FAKE_CV_UPLOAD_ID,
        file_path="/tmp/resume.pdf", status=status, total_pages=total_pages,
        analyzed_pages=analyzed_pages, error=error, result=result,
    )


def post_valid_upload(cv_client: TestClient) -> object:
    """Post a valid PDF upload with all I/O mocked; return the response."""
    ctx = AsyncMock()
    ctx.__aenter__.return_value = AsyncMock()
    ctx.__aexit__.return_value = False
    fake_row, fake_job = MagicMock(), MagicMock()
    fake_row.id = FAKE_CV_UPLOAD_ID
    fake_job.job_id = FAKE_JOB_ID
    with (
        patch("backend.api.routers.cv.asyncio.to_thread", new_callable=AsyncMock),
        patch("backend.api.routers.cv.AsyncSessionLocal", return_value=ctx),
        patch("backend.api.routers.cv.create_cv_upload", new_callable=AsyncMock, return_value=fake_row),
        patch("backend.api.routers.cv.worker.create_job", return_value=fake_job),
        patch("backend.api.routers.cv.worker.submit_job", new_callable=AsyncMock),
    ):
        return cv_client.post("/api/cv/upload", files={"file": VALID_PDF}, data={"citizen_id": FAKE_CITIZEN_ID})


def post_anonymous_upload(cv_client: TestClient) -> object:
    """Post a valid PDF upload without citizen_id; all I/O mocked."""
    ctx = AsyncMock()
    ctx.__aenter__.return_value = AsyncMock()
    ctx.__aexit__.return_value = False
    fake_row, fake_job = MagicMock(), MagicMock()
    fake_row.id = FAKE_CV_UPLOAD_ID
    fake_job.job_id = FAKE_JOB_ID
    with (
        patch("backend.api.routers.cv.asyncio.to_thread", new_callable=AsyncMock),
        patch("backend.api.routers.cv.AsyncSessionLocal", return_value=ctx),
        patch("backend.api.routers.cv.create_cv_upload", new_callable=AsyncMock, return_value=fake_row),
        patch("backend.api.routers.cv.worker.create_job", return_value=fake_job),
        patch("backend.api.routers.cv.worker.submit_job", new_callable=AsyncMock),
    ):
        return cv_client.post("/api/cv/upload", files={"file": VALID_PDF})


def get_job(cv_client: TestClient, state: JobState) -> object:
    """GET /api/cv/jobs/{id} with the given Redis job state mocked."""
    with patch("backend.api.routers.cv.job_tracker.load_job_state", new_callable=AsyncMock, return_value=state):
        return cv_client.get(f"/api/cv/jobs/{FAKE_JOB_ID}")
