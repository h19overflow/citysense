"""Cache-miss tests for jobs, housing, benefits, and news detail endpoints.

Addresses three Sourcery PR comments:
  #2 — jobs/housing/benefits fall through to DB on cache miss
  #3 — news detail endpoint honours cache hit and falls through on miss
  #4 — cache.store is called with ttl=300 on a jobs cache miss
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Comment #2 — cache-miss path for jobs / housing / benefits
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestCacheMissDbQueries:
    def test_jobs_queries_db_on_cache_miss(self, test_client: TestClient) -> None:
        """GET /api/jobs with no cached value should query DB and store result."""
        with (
            patch(
                "backend.api.routers.jobs.cache.fetch", return_value=None
            ),
            patch(
                "backend.api.routers.jobs.cache.store"
            ) as mock_store,
            patch(
                "backend.api.routers.jobs.list_jobs",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            response = test_client.get("/api/jobs")

        assert response.status_code == 200
        assert response.json() == {"type": "FeatureCollection", "features": []}
        # Comment #4 — store is called exactly once with ttl=300
        mock_store.assert_called_once()
        _, kwargs = mock_store.call_args
        assert kwargs.get("ttl") == 300

    def test_housing_queries_db_on_cache_miss(self, test_client: TestClient) -> None:
        """GET /api/housing with no cached value should query DB and store result."""
        with (
            patch(
                "backend.api.routers.housing.cache.fetch", return_value=None
            ),
            patch("backend.api.routers.housing.cache.store") as mock_store,
            patch(
                "backend.api.routers.housing.list_housing",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            response = test_client.get("/api/housing")

        assert response.status_code == 200
        assert response.json() == {"type": "FeatureCollection", "features": []}
        mock_store.assert_called_once()

    def test_benefits_queries_db_on_cache_miss(self, test_client: TestClient) -> None:
        """GET /api/benefits with no cached value should query DB and store result."""
        with (
            patch(
                "backend.api.routers.benefits.cache.fetch", return_value=None
            ),
            patch("backend.api.routers.benefits.cache.store") as mock_store,
            patch(
                "backend.api.routers.benefits.list_benefits",
                new_callable=AsyncMock,
                return_value=[],
            ),
        ):
            response = test_client.get("/api/benefits")

        assert response.status_code == 200
        assert response.json() == {"services": []}
        mock_store.assert_called_once()


# ---------------------------------------------------------------------------
# Comment #3 — news detail endpoint cache hit and miss
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestNewsDetailCaching:
    def test_news_detail_returns_cached_on_hit(
        self, test_client: TestClient
    ) -> None:
        """GET /api/news/{id} should return cached dict without touching the DB."""
        cached_detail = {"id": "x", "title": "Cached Detail"}

        with (
            patch(
                "backend.api.routers.news.cache.fetch",
                return_value=cached_detail,
            ),
            patch(
                "backend.api.routers.news.get_article_by_id"
            ) as mock_get,
        ):
            response = test_client.get("/api/news/x")

        assert response.status_code == 200
        assert response.json() == cached_detail
        mock_get.assert_not_called()

    def test_news_detail_queries_db_on_cache_miss(
        self, test_client: TestClient
    ) -> None:
        """GET /api/news/{id} with no cache should fetch the article from DB."""
        fake_article = MagicMock()
        fake_article.id = "x"
        fake_article.title = "DB Detail"
        fake_article.excerpt = ""
        fake_article.body = ""
        fake_article.source = ""
        fake_article.source_url = ""
        fake_article.image_url = ""
        fake_article.category = "local"
        fake_article.published_at = None
        fake_article.scraped_at = None
        fake_article.upvotes = 0
        fake_article.downvotes = 0
        fake_article.comment_count = 0
        fake_article.sentiment = ""
        fake_article.sentiment_score = 0.0
        fake_article.misinfo_risk = 0.0
        fake_article.summary = ""
        fake_article.location = ""
        fake_article.reaction_counts = {}

        with (
            patch(
                "backend.api.routers.news.cache.fetch", return_value=None
            ),
            patch("backend.api.routers.news.cache.store"),
            patch(
                "backend.api.routers.news.get_article_by_id",
                new_callable=AsyncMock,
                return_value=fake_article,
            ),
        ):
            response = test_client.get("/api/news/x")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == "x"
        assert body["title"] == "DB Detail"
