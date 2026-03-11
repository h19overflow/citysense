"""Tests for CV upload and stream endpoints.

POST /cv/upload — positive, negative, edge cases
GET /cv/jobs/{id}/stream — 503 Redis guard
"""

from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.tests.cv_test_helpers import (
    FAKE_JOB_ID, FAKE_CITIZEN_ID, VALID_PDF,
    cv_client, post_valid_upload,  # noqa: F401 — re-exported fixtures/helpers
)


@contextmanager
def _cache_unavailable():
    with patch("backend.api.routers.cv.asyncio.to_thread", new_callable=AsyncMock, return_value=False):
        yield


@pytest.mark.unit
class TestUploadCVSuccess:
    def test_returns_200_on_valid_upload(self, cv_client: TestClient) -> None:
        """Valid multipart PDF upload with citizen_id returns 200."""
        assert post_valid_upload(cv_client).status_code == 200

    def test_response_contains_job_id(self, cv_client: TestClient) -> None:
        """Upload response must include the job_id from the queued job."""
        assert post_valid_upload(cv_client).json()["job_id"] == FAKE_JOB_ID

    def test_response_contains_cv_upload_id(self, cv_client: TestClient) -> None:
        """Upload response must include the cv_upload_id from the DB row."""
        from backend.tests.cv_test_helpers import FAKE_CV_UPLOAD_ID
        assert post_valid_upload(cv_client).json()["cv_upload_id"] == FAKE_CV_UPLOAD_ID


@pytest.mark.unit
class TestUploadCVValidation:
    def test_missing_citizen_id_returns_422(self, cv_client: TestClient) -> None:
        """Upload without citizen_id form field must return 422."""
        assert cv_client.post("/api/cv/upload", files={"file": VALID_PDF}).status_code == 422

    def test_missing_file_returns_422(self, cv_client: TestClient) -> None:
        """Upload without a file must return 422."""
        assert cv_client.post("/api/cv/upload", data={"citizen_id": FAKE_CITIZEN_ID}).status_code == 422

    def test_unsupported_file_type_returns_422(self, cv_client: TestClient) -> None:
        """Upload of a non-PDF/DOCX file must return 422."""
        bad_file = ("resume.txt", b"plain text", "text/plain")
        response = cv_client.post("/api/cv/upload", files={"file": bad_file}, data={"citizen_id": FAKE_CITIZEN_ID})
        assert response.status_code == 422


@pytest.mark.unit
class TestStreamJobProgress:
    def test_returns_503_when_redis_unavailable(self, cv_client: TestClient) -> None:
        """Stream endpoint returns 503 when cache.is_available() returns False."""
        with _cache_unavailable():
            assert cv_client.get(f"/api/cv/jobs/{FAKE_JOB_ID}/stream").status_code == 503

    def test_503_detail_mentions_redis(self, cv_client: TestClient) -> None:
        """Stream 503 response detail must mention Redis."""
        with _cache_unavailable():
            detail = cv_client.get(f"/api/cv/jobs/{FAKE_JOB_ID}/stream").json()["detail"]
            assert "redis" in detail.lower()
