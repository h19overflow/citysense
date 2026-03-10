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
_PROCESS_JOBS_BG = "backend.api.routers.webhooks._process_jobs_background"
_PROCESS_NEWS_BG = "backend.api.routers.webhooks._process_news_background"
_PROCESS_HOUSING_BG = "backend.api.routers.webhooks._process_housing_background"
_NEWS_SCRAPER = "backend.api.routers.webhooks.NewsScraper"

VALID_JOB_PAYLOAD = [{"job_title": "Engineer", "company_name": "Acme", "url": "http://example.com"}]
VALID_NEWS_PAYLOAD = {"news": [{"title": "Article 1", "url": "http://example.com/1"}]}
VALID_HOUSING_PAYLOAD = [{"address": "123 Main St", "price": 250000, "url": "http://zillow.com/1"}]


# ---------------------------------------------------------------------------
# /api/webhook/jobs
# ---------------------------------------------------------------------------

class TestWebhookJobs:
    def test_valid_payload_returns_ok(self, test_client: TestClient) -> None:
        """Valid job records should be accepted and return ok=True."""
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_JOBS_BG) as mock_bg,
        ):
            response = test_client.post("/api/webhook/jobs", json=VALID_JOB_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_valid_payload_dispatches_background_with_tagged_jobs(
        self, test_client: TestClient,
    ) -> None:
        """Jobs should be tagged with _source='webhook' before background dispatch."""
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_JOBS_BG) as mock_bg,
        ):
            response = test_client.post("/api/webhook/jobs", json=VALID_JOB_PAYLOAD)
        assert response.status_code == 200
        mock_bg.assert_called_once()
        dispatched_jobs = mock_bg.call_args.args[0]
        assert all(j["_source"] == "webhook" for j in dispatched_jobs)

    def test_invalid_json_returns_422(self, test_client: TestClient) -> None:
        """Malformed JSON body should return 422."""
        response = test_client.post(
            "/api/webhook/jobs",
            content=b"not-json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_empty_list_accepts_zero(self, test_client: TestClient) -> None:
        """Empty job list should return ok=True with 0 accepted."""
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_JOBS_BG),
        ):
            response = test_client.post("/api/webhook/jobs", json=[])
        assert response.status_code == 200
        assert response.json()["accepted"] == 0


# ---------------------------------------------------------------------------
# /api/webhook/news
# ---------------------------------------------------------------------------

class TestWebhookNews:
    def test_valid_payload_returns_ok(self, test_client: TestClient) -> None:
        """Valid news payload should be accepted and return ok=True."""
        mock_scraper = MagicMock()
        mock_scraper._parse_serp_results.return_value = [{"title": "A", "sourceUrl": "http://x.com"}]
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_NEWS_SCRAPER, return_value=mock_scraper),
            patch(_PROCESS_NEWS_BG),
        ):
            response = test_client.post("/api/webhook/news", json=VALID_NEWS_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_parse_serp_results_called_with_webhook_body(
        self, test_client: TestClient,
    ) -> None:
        """Should extract articles from SERP body via _parse_serp_results."""
        mock_scraper = MagicMock()
        mock_scraper._parse_serp_results.return_value = [{"title": "A", "sourceUrl": "http://x.com"}]
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_NEWS_SCRAPER, return_value=mock_scraper),
            patch(_PROCESS_NEWS_BG) as mock_bg,
        ):
            response = test_client.post("/api/webhook/news", json=VALID_NEWS_PAYLOAD)
        mock_scraper._parse_serp_results.assert_called_once()
        mock_bg.assert_called_once()
        assert response.json()["accepted"] == 1

    def test_invalid_json_returns_422(self, test_client: TestClient) -> None:
        """Malformed JSON body should return 422."""
        response = test_client.post(
            "/api/webhook/news",
            content=b"{bad json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/webhook/housing
# ---------------------------------------------------------------------------

class TestWebhookHousing:
    def test_valid_payload_returns_ok(self, test_client: TestClient) -> None:
        """Valid housing payload should be accepted and return ok=True."""
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_HOUSING_BG),
        ):
            response = test_client.post("/api/webhook/housing", json=VALID_HOUSING_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_dispatches_validated_listings_to_background(
        self, test_client: TestClient,
    ) -> None:
        """Background task should receive validated listing dicts."""
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_HOUSING_BG) as mock_bg,
        ):
            response = test_client.post("/api/webhook/housing", json=VALID_HOUSING_PAYLOAD)
        assert response.status_code == 200
        mock_bg.assert_called_once()
        dispatched = mock_bg.call_args.args[0]
        assert len(dispatched) == len(VALID_HOUSING_PAYLOAD)

    def test_invalid_json_returns_422(self, test_client: TestClient) -> None:
        """Malformed JSON body should return 422."""
        response = test_client.post(
            "/api/webhook/housing",
            content=b"!!!",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class TestWebhookAuthentication:
    def test_no_secret_allows_unauthenticated_request(self, test_client: TestClient) -> None:
        """When WEBHOOK_SECRET is unset, all requests should pass through."""
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_JOBS_BG),
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
        with (
            patch(_PATCH_SAVE_RAW),
            patch(_PROCESS_JOBS_BG),
        ):
            response = authenticated_client.post(
                "/api/webhook/jobs",
                json=VALID_JOB_PAYLOAD,
                headers={"Authorization": "Bearer test-secret"},
            )
        assert response.status_code == 200
