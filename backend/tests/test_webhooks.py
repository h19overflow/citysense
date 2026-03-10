"""Integration tests for /api/webhook endpoints.

All file I/O and processing functions are patched so tests run without
a filesystem or Bright Data connection.
"""

import os
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

# Patch targets — prevent real file writes and external calls during tests
_PATCH_SAVE_RAW = "backend.api.routers.webhooks.save_raw_webhook"
_JOBS_SCRAPER = "backend.api.routers.webhooks.JobsScraper"
_NEWS_SCRAPER = "backend.api.routers.webhooks.NewsScraper"
_HOUSING_SCRAPER = "backend.api.routers.webhooks.HousingScraper"

VALID_JOB_PAYLOAD = [{"job_title": "Engineer", "company_name": "Acme", "url": "http://example.com"}]
VALID_NEWS_PAYLOAD = {"news": [{"title": "Article 1", "url": "http://example.com/1"}]}
VALID_HOUSING_PAYLOAD = [{"address": "123 Main St", "price": 250000, "url": "http://zillow.com/1"}]


def _mock_scraper(process_return: list[dict] | None = None) -> MagicMock:
    """Create a mock scraper instance with default return values."""
    scraper = MagicMock()
    scraper.process.return_value = process_return or []
    scraper.load_existing.return_value = []
    scraper.deduplicate.return_value = process_return or []
    scraper.save.return_value = None
    scraper.broadcast.return_value = None
    return scraper


# ---------------------------------------------------------------------------
# /api/webhook/jobs
# ---------------------------------------------------------------------------

class TestWebhookJobs:
    def test_valid_payload_returns_ok(self, test_client: TestClient) -> None:
        """Valid job records should be accepted and return ok=True."""
        scraper = _mock_scraper([{"type": "Feature"}])
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_JOBS_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/jobs", json=VALID_JOB_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_invalid_json_returns_422(self, test_client: TestClient) -> None:
        """Malformed JSON body should return 422."""
        response = test_client.post(
            "/api/webhook/jobs",
            content=b"not-json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_empty_list_processes_zero_features(self, test_client: TestClient) -> None:
        """Empty job list should return ok=True with 0 processed."""
        scraper = _mock_scraper([])
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_JOBS_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/jobs", json=[])
        assert response.status_code == 200
        assert response.json()["processed"] == 0


# ---------------------------------------------------------------------------
# /api/webhook/news
# ---------------------------------------------------------------------------

class TestWebhookNews:
    def test_valid_payload_returns_ok(self, test_client: TestClient) -> None:
        """Valid news payload should be accepted and return ok=True."""
        scraper = _mock_scraper([{"title": "A"}])
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_NEWS_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/news", json=VALID_NEWS_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_invalid_json_returns_422(self, test_client: TestClient) -> None:
        """Malformed JSON body should return 422."""
        response = test_client.post(
            "/api/webhook/news",
            content=b"{bad json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_article_count_matches_parsed(self, test_client: TestClient) -> None:
        """articles count in response should reflect number parsed."""
        fake_articles = [{"title": "A"}, {"title": "B"}, {"title": "C"}]
        scraper = _mock_scraper(fake_articles)
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_NEWS_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/news", json=VALID_NEWS_PAYLOAD)
        assert response.json()["articles"] == 3


# ---------------------------------------------------------------------------
# /api/webhook/housing
# ---------------------------------------------------------------------------

class TestWebhookHousing:
    def test_valid_payload_returns_ok(self, test_client: TestClient) -> None:
        """Valid housing payload should be accepted and return ok=True."""
        scraper = _mock_scraper([{"type": "Feature"}])
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_HOUSING_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/housing", json=VALID_HOUSING_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_invalid_json_returns_422(self, test_client: TestClient) -> None:
        """Malformed JSON body should return 422."""
        response = test_client.post(
            "/api/webhook/housing",
            content=b"!!!",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_listings_count_matches_processed(self, test_client: TestClient) -> None:
        """listings count should match the number of features returned."""
        features = [{"type": "Feature"}, {"type": "Feature"}]
        scraper = _mock_scraper(features)
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_HOUSING_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/housing", json=VALID_HOUSING_PAYLOAD)
        assert response.json()["listings"] == 2


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class TestWebhookAuthentication:
    def test_no_secret_allows_unauthenticated_request(self, test_client: TestClient) -> None:
        """When WEBHOOK_SECRET is unset, all requests should pass through."""
        scraper = _mock_scraper([])
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_JOBS_SCRAPER, return_value=scraper),
        ):
            response = test_client.post("/api/webhook/jobs", json=VALID_JOB_PAYLOAD)
        assert response.status_code == 200

    def test_missing_token_returns_401_when_secret_set(
        self, authenticated_client: TestClient
    ) -> None:
        """When WEBHOOK_SECRET is set, requests without a token should get 401."""
        response = authenticated_client.post("/api/webhook/jobs", json=VALID_JOB_PAYLOAD)
        assert response.status_code == 401

    def test_wrong_token_returns_401(self, authenticated_client: TestClient) -> None:
        """Wrong Bearer token should return 401."""
        response = authenticated_client.post(
            "/api/webhook/jobs",
            json=VALID_JOB_PAYLOAD,
            headers={"Authorization": "Bearer wrong-secret"},
        )
        assert response.status_code == 401

    def test_correct_token_allows_request(self, authenticated_client: TestClient) -> None:
        """Correct Bearer token should allow the request through."""
        scraper = _mock_scraper([])
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_JOBS_SCRAPER, return_value=scraper),
        ):
            response = authenticated_client.post(
                "/api/webhook/jobs",
                json=VALID_JOB_PAYLOAD,
                headers={"Authorization": "Bearer test-secret"},
            )
        assert response.status_code == 200
