"""Tests for GET /api/cv/jobs/{job_id}/stream SSE endpoint.

test_cv_api.py covers the 503 Redis-unavailable guard.
This file covers the happy path content-type and the unknown job_id warning path.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _make_cv_client() -> TestClient:
    """Build a minimal TestClient that mounts only the CV router."""
    from backend.api.routers.cv import router
    app = FastAPI()
    # The CV router already has prefix="/cv" built-in, so mount at "/api"
    app.include_router(router, prefix="/api")
    return TestClient(app, raise_server_exceptions=False)


async def _single_event_generator(*_args: str):
    yield "data: {}\n\n"


@pytest.mark.unit
class TestCVStreamContentType:
    def test_stream_returns_text_event_stream_content_type(self):
        """Stream endpoint responds with text/event-stream when Redis is available."""
        mock_state = MagicMock()
        mock_state.status = "queued"
        mock_state.analyzed_pages = 0
        mock_state.total_pages = 1
        mock_state.error = None
        mock_state.result = None

        client = _make_cv_client()

        with (
            patch("backend.api.routers.cv.asyncio.to_thread", new_callable=AsyncMock, return_value=True),
            patch("backend.api.routers.cv.job_tracker.load_job_state", new_callable=AsyncMock, return_value=mock_state),
            patch("backend.api.routers.cv.stream_job_events", side_effect=_single_event_generator),
        ):
            response = client.get("/api/cv/jobs/job-abc/stream")

        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")


@pytest.mark.unit
class TestCVStreamUnknownJob:
    def test_stream_with_unknown_job_id_still_starts_when_redis_available(self):
        """Stream starts even for an unknown job_id — endpoint does not return 404."""
        client = _make_cv_client()

        with (
            patch("backend.api.routers.cv.asyncio.to_thread", new_callable=AsyncMock, return_value=True),
            patch("backend.api.routers.cv.job_tracker.load_job_state", new_callable=AsyncMock, return_value=None),
            patch("backend.api.routers.cv.stream_job_events", side_effect=_single_event_generator),
        ):
            response = client.get("/api/cv/jobs/nonexistent-job/stream")

        assert response.status_code == 200
