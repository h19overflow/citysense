"""Integration tests for the FastAPI API layer.

Tests cover: health check, comments CRUD, analysis status, predictions
(hotspots and trends), roadmap validation, comment validation, and SSE
stream content-type. All external calls (LLM, filesystem) are patched.
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_returns_ok_status(self, test_client: TestClient) -> None:
        """Health endpoint should report status=ok."""
        response = test_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_includes_expected_streams(self, test_client: TestClient) -> None:
        """Health endpoint must list all four data streams."""
        response = test_client.get("/health")
        streams = response.json()["streams"]
        assert set(streams) == {"jobs", "news", "housing", "benefits"}

    def test_response_includes_timestamp(self, test_client: TestClient) -> None:
        """Health response must include an ISO-8601 timestamp."""
        response = test_client.get("/health")
        assert "timestamp" in response.json()
        assert "T" in response.json()["timestamp"]  # ISO-8601 marker


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

VALID_COMMENT = {
    "id": "cmt-001",
    "articleId": "art-001",
    "citizenId": "user-1",
    "citizenName": "Alice",
    "avatarInitials": "AL",
    "avatarColor": "#ff0000",
    "content": "Great article.",
    "createdAt": "2026-03-01T10:00:00Z",
}


class TestCommentsCRUD:
    def test_get_comments_returns_list(self, test_client: TestClient) -> None:
        """GET /api/comments should return a dict with a comments list."""
        with patch("backend.api.routers.comments._load_comments", return_value=[]):
            response = test_client.get("/api/comments")
        assert response.status_code == 200
        assert "comments" in response.json()
        assert isinstance(response.json()["comments"], list)

    def test_post_comment_returns_201_and_id(self, test_client: TestClient) -> None:
        """Valid comment POST should return 201 and echo the comment id."""
        with (
            patch("backend.api.routers.comments._load_comments", return_value=[]),
            patch("backend.api.routers.comments._save_comments"),
        ):
            response = test_client.post("/api/comments", json=VALID_COMMENT)
        assert response.status_code == 201
        assert response.json()["id"] == VALID_COMMENT["id"]

    def test_post_comment_status_is_ok(self, test_client: TestClient) -> None:
        """Successful comment POST must include status=ok."""
        with (
            patch("backend.api.routers.comments._load_comments", return_value=[]),
            patch("backend.api.routers.comments._save_comments"),
        ):
            response = test_client.post("/api/comments", json=VALID_COMMENT)
        assert response.json()["status"] == "ok"

    def test_posted_comment_appears_in_get(self, test_client: TestClient) -> None:
        """A posted comment should be returned by GET /api/comments."""
        stored: list[dict] = []

        def fake_load():
            return list(stored)

        def fake_save(comments):
            stored.clear()
            stored.extend(comments)

        with (
            patch("backend.api.routers.comments._load_comments", side_effect=fake_load),
            patch("backend.api.routers.comments._save_comments", side_effect=fake_save),
        ):
            test_client.post("/api/comments", json=VALID_COMMENT)
            response = test_client.get("/api/comments")

        ids = [c["id"] for c in response.json()["comments"]]
        assert VALID_COMMENT["id"] in ids

    def test_missing_id_returns_422(self, test_client: TestClient) -> None:
        """Comment missing required id field should return 422."""
        payload = {k: v for k, v in VALID_COMMENT.items() if k != "id"}
        response = test_client.post("/api/comments", json=payload)
        assert response.status_code == 422

    def test_missing_created_at_returns_422(self, test_client: TestClient) -> None:
        """Comment missing required createdAt field should return 422."""
        payload = {k: v for k, v in VALID_COMMENT.items() if k != "createdAt"}
        response = test_client.post("/api/comments", json=payload)
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Analysis status
# ---------------------------------------------------------------------------

class TestAnalysisStatus:
    def test_initial_state_is_idle(self, test_client: TestClient) -> None:
        """Analysis status should default to idle on startup."""
        response = test_client.get("/api/analysis/status")
        assert response.status_code == 200
        assert response.json()["state"] == "idle"

    def test_status_response_has_message_key(self, test_client: TestClient) -> None:
        """Analysis status response must contain a message field."""
        response = test_client.get("/api/analysis/status")
        assert "message" in response.json()

    def test_results_returns_404_when_no_file(self, test_client: TestClient) -> None:
        """GET /api/analysis/results returns 404 when no results exist yet."""
        with patch("backend.api.routers.analysis.ANALYSIS_PATH") as mock_path:
            mock_path.exists.return_value = False
            response = test_client.get("/api/analysis/results")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Predictions — hotspots and trends
# ---------------------------------------------------------------------------

FAKE_HOTSPOT = {
    "area_id": "area-1",
    "neighborhood": "Downtown",
    "category": "infrastructure",
    "hotspot_score": 72.5,
    "risk_level": "high",
    "drivers": [],
    "trend_direction": "rising",
    "recommended_label_for_ui": "Downtown: High infrastructure risk",
    "explanation": "Downtown shows elevated activity.",
}

FAKE_TREND = {
    "category": "potholes",
    "current_volume": 30,
    "previous_volume": 20,
    "growth_rate": 50.0,
    "trend_direction": "rising",
    "top_neighborhoods": ["Downtown"],
    "explanation": "Pothole complaints rose from 20 to 30.",
}


class TestPredictionsHotspots:
    def test_returns_200(self, test_client: TestClient) -> None:
        """GET /api/predictions/hotspots should return 200."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_HOTSPOT
        with patch("backend.core.predictive.hotspot_scorer.compute_hotspots", return_value=[fake]):
            response = test_client.get("/api/predictions/hotspots")
        assert response.status_code == 200

    def test_response_contains_hotspots_list(self, test_client: TestClient) -> None:
        """Hotspots response must include a hotspots list."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_HOTSPOT
        with patch("backend.core.predictive.hotspot_scorer.compute_hotspots", return_value=[fake]):
            response = test_client.get("/api/predictions/hotspots")
        assert "hotspots" in response.json()
        assert isinstance(response.json()["hotspots"], list)

    def test_hotspot_item_has_required_keys(self, test_client: TestClient) -> None:
        """Each hotspot item must have area_id, risk_level, and hotspot_score."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_HOTSPOT
        with patch("backend.core.predictive.hotspot_scorer.compute_hotspots", return_value=[fake]):
            response = test_client.get("/api/predictions/hotspots")
        item = response.json()["hotspots"][0]
        assert "area_id" in item
        assert "risk_level" in item
        assert "hotspot_score" in item

    def test_response_contains_weights(self, test_client: TestClient) -> None:
        """Hotspots response must include the scoring weights dict."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_HOTSPOT
        with patch("backend.core.predictive.hotspot_scorer.compute_hotspots", return_value=[fake]):
            response = test_client.get("/api/predictions/hotspots")
        weights = response.json()["weights"]
        assert "complaint_volume" in weights
        assert isinstance(weights["complaint_volume"], float)

    def test_response_contains_timestamp(self, test_client: TestClient) -> None:
        """Hotspots response must include a timestamp."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_HOTSPOT
        with patch("backend.core.predictive.hotspot_scorer.compute_hotspots", return_value=[fake]):
            response = test_client.get("/api/predictions/hotspots")
        assert "timestamp" in response.json()


class TestPredictionsTrends:
    def test_returns_200(self, test_client: TestClient) -> None:
        """GET /api/predictions/trends should return 200."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_TREND
        with patch("backend.core.predictive.trend_detector.detect_trends", return_value=[fake]):
            response = test_client.get("/api/predictions/trends")
        assert response.status_code == 200

    def test_response_contains_trends_list(self, test_client: TestClient) -> None:
        """Trends response must include a trends list."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_TREND
        with patch("backend.core.predictive.trend_detector.detect_trends", return_value=[fake]):
            response = test_client.get("/api/predictions/trends")
        assert "trends" in response.json()
        assert isinstance(response.json()["trends"], list)

    def test_trend_item_has_required_keys(self, test_client: TestClient) -> None:
        """Each trend item must expose category, growth_rate, and trend_direction."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_TREND
        with patch("backend.core.predictive.trend_detector.detect_trends", return_value=[fake]):
            response = test_client.get("/api/predictions/trends")
        item = response.json()["trends"][0]
        assert "category" in item
        assert "growth_rate" in item
        assert "trend_direction" in item

    def test_trend_direction_is_valid_value(self, test_client: TestClient) -> None:
        """trend_direction must be one of rising, falling, or stable."""
        fake = MagicMock()
        fake.to_dict.return_value = FAKE_TREND
        with patch("backend.core.predictive.trend_detector.detect_trends", return_value=[fake]):
            response = test_client.get("/api/predictions/trends")
        direction = response.json()["trends"][0]["trend_direction"]
        assert direction in {"rising", "falling", "stable"}


# ---------------------------------------------------------------------------
# Roadmap validation
# ---------------------------------------------------------------------------

class TestRoadmapValidation:
    def test_missing_service_id_returns_422(self, test_client: TestClient) -> None:
        """Roadmap request without serviceId should return 422."""
        response = test_client.post("/api/roadmap/generate", json={})
        assert response.status_code == 422

    def test_invalid_service_id_returns_404(self, test_client: TestClient) -> None:
        """Unknown serviceId should return 404 with an error message."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            side_effect=ValueError("Service 'bad-id' not found. Available: snap, liheap"),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "bad-id"},
            )
        assert response.status_code == 404

    def test_invalid_service_error_mentions_available_services(self, test_client: TestClient) -> None:
        """404 detail for unknown service must list available service ids."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            side_effect=ValueError("Service 'bad-id' not found. Available: snap, liheap"),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "bad-id"},
            )
        assert "Available" in response.json()["detail"]

    def test_runtime_error_returns_503(self, test_client: TestClient) -> None:
        """LLM generation failure should return 503."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            side_effect=RuntimeError("Gemini generation failed"),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "snap"},
            )
        assert response.status_code == 503


# ---------------------------------------------------------------------------
# SSE stream content-type
# ---------------------------------------------------------------------------

class TestSSEStream:
    def test_stream_endpoint_returns_event_stream_content_type(
        self, test_client: TestClient
    ) -> None:
        """GET /api/stream must return text/event-stream content-type header."""
        # Patch stream_events so the generator closes immediately, preventing hang.
        with (
            patch("backend.api.routers.stream.create_client_queue", return_value=None),
            patch("backend.api.routers.stream.remove_client_queue"),
            patch(
                "backend.api.routers.stream.stream_events",
                side_effect=_emit_one_chunk_then_stop,
            ),
        ):
            with test_client.stream("GET", "/api/stream") as response:
                assert "text/event-stream" in response.headers["content-type"]


async def _emit_one_chunk_then_stop(_queue):
    """Yield a single SSE chunk then return so the connection closes cleanly."""
    yield "data: ping\n\n"
