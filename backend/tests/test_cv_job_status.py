"""Tests for GET /api/cv/jobs/{job_id} endpoint.

Positive: existing jobs in various states.
Negative: missing job → 404.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.core.cv_pipeline.schemas import CVAnalysisResult, JobStatus
from backend.tests.cv_test_helpers import (
    FAKE_JOB_ID,
    cv_client,  # noqa: F401
    get_job,
    make_job_state,
)


@pytest.mark.unit
class TestGetJobStatusFound:
    def test_returns_200_when_job_exists(self, cv_client: TestClient) -> None:
        """Job status endpoint returns 200 when the job is in Redis."""
        response = get_job(cv_client, make_job_state(JobStatus.ANALYZING, total_pages=3, analyzed_pages=1))
        assert response.status_code == 200

    def test_response_echoes_job_id(self, cv_client: TestClient) -> None:
        """Job status response must echo the job_id from state."""
        assert get_job(cv_client, make_job_state()).json()["job_id"] == FAKE_JOB_ID

    def test_response_contains_correct_status(self, cv_client: TestClient) -> None:
        """Job status response must include the current status string."""
        assert get_job(cv_client, make_job_state(JobStatus.INGESTING)).json()["status"] == "ingesting"

    def test_completed_job_reports_100_progress(self, cv_client: TestClient) -> None:
        """Completed job must report progress_pct of 100."""
        assert get_job(cv_client, make_job_state(JobStatus.COMPLETED)).json()["progress_pct"] == 100

    def test_completed_job_populates_result(self, cv_client: TestClient) -> None:
        """Completed job response must include the aggregated analysis result."""
        result = CVAnalysisResult(skills=["Python", "SQL"], roles=["Data Analyst"], page_count=2)
        body = get_job(cv_client, make_job_state(JobStatus.COMPLETED, result=result)).json()
        assert body["result"] is not None
        assert "Python" in body["result"]["skills"]

    def test_in_progress_job_result_is_null(self, cv_client: TestClient) -> None:
        """In-progress job must return null for the result field."""
        state = make_job_state(JobStatus.ANALYZING, total_pages=5, analyzed_pages=2)
        assert get_job(cv_client, state).json()["result"] is None

    def test_failed_job_carries_error_message(self, cv_client: TestClient) -> None:
        """Failed job response must carry the error string set by the pipeline."""
        state = make_job_state(JobStatus.FAILED, error="Gemini timeout")
        assert get_job(cv_client, state).json()["error"] == "Gemini timeout"


@pytest.mark.unit
class TestGetJobStatusNotFound:
    def test_returns_404_when_job_missing(self, cv_client: TestClient) -> None:
        """Job status endpoint returns 404 when Redis has no matching job."""
        with patch("backend.api.routers.cv.job_tracker.load_job_state", new_callable=AsyncMock, return_value=None):
            assert cv_client.get("/api/cv/jobs/nonexistent-job").status_code == 404

    def test_404_detail_mentions_job_not_found(self, cv_client: TestClient) -> None:
        """404 detail message must indicate the job was not found."""
        with patch("backend.api.routers.cv.job_tracker.load_job_state", new_callable=AsyncMock, return_value=None):
            detail = cv_client.get("/api/cv/jobs/nonexistent-job").json()["detail"]
            assert "not found" in detail.lower()
