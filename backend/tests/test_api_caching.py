"""Tests for Redis-cached API endpoints (news, jobs, housing, benefits).

Each test verifies the two-branch caching pattern:
  - cache hit  → return cached dict directly, no DB call
  - cache miss → query DB, build result, store in cache
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


CACHED_NEWS = {"totalArticles": 1, "articles": [{"id": "art-1", "title": "Cached"}]}
CACHED_JOBS = {"type": "FeatureCollection", "features": [{"type": "Feature"}]}
CACHED_HOUSING = {"type": "FeatureCollection", "features": []}
CACHED_BENEFITS = {"services": [{"id": "svc-1", "title": "SNAP"}]}


# ---------------------------------------------------------------------------
# Cached endpoints — cache hit
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestCachedEndpoints:
    def test_news_returns_cached_response_on_hit(
        self, test_client: TestClient
    ) -> None:
        """GET /api/news should return the cached dict without touching the DB."""
        with (
            patch("backend.api.routers.news.cache.fetch", return_value=CACHED_NEWS),
            patch("backend.api.routers.news.list_articles") as mock_list,
            patch("backend.api.routers.news.count_articles") as mock_count,
        ):
            response = test_client.get("/api/news")

        assert response.status_code == 200
        assert response.json() == CACHED_NEWS
        mock_list.assert_not_called()
        mock_count.assert_not_called()

    def test_news_queries_db_on_cache_miss(
        self, test_client: TestClient
    ) -> None:
        """GET /api/news with cache miss should query DB and return DB result."""
        fake_article = MagicMock()
        fake_article.id = "art-db"
        fake_article.title = "DB Article"
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
            patch("backend.api.routers.news.cache.fetch", return_value=None),
            patch("backend.api.routers.news.cache.store"),
            patch(
                "backend.api.routers.news.list_articles",
                new_callable=AsyncMock,
                return_value=[fake_article],
            ),
            patch(
                "backend.api.routers.news.count_articles",
                new_callable=AsyncMock,
                return_value=1,
            ),
        ):
            response = test_client.get("/api/news")

        assert response.status_code == 200
        body = response.json()
        assert body["totalArticles"] == 1
        assert body["articles"][0]["id"] == "art-db"

    def test_jobs_returns_cached_response_on_hit(
        self, test_client: TestClient
    ) -> None:
        """GET /api/jobs should return the cached GeoJSON without querying DB."""
        with (
            patch("backend.api.routers.jobs.cache.fetch", return_value=CACHED_JOBS),
            patch("backend.api.routers.jobs.list_jobs") as mock_list,
        ):
            response = test_client.get("/api/jobs")

        assert response.status_code == 200
        assert response.json() == CACHED_JOBS
        mock_list.assert_not_called()

    def test_housing_returns_cached_response_on_hit(
        self, test_client: TestClient
    ) -> None:
        """GET /api/housing should return the cached GeoJSON without querying DB."""
        with (
            patch(
                "backend.api.routers.housing.cache.fetch",
                return_value=CACHED_HOUSING,
            ),
            patch("backend.api.routers.housing.list_housing") as mock_list,
        ):
            response = test_client.get("/api/housing")

        assert response.status_code == 200
        assert response.json() == CACHED_HOUSING
        mock_list.assert_not_called()

    def test_benefits_returns_cached_response_on_hit(
        self, test_client: TestClient
    ) -> None:
        """GET /api/benefits should return the cached services dict without querying DB."""
        with (
            patch(
                "backend.api.routers.benefits.cache.fetch",
                return_value=CACHED_BENEFITS,
            ),
            patch("backend.api.routers.benefits.list_benefits") as mock_list,
        ):
            response = test_client.get("/api/benefits")

        assert response.status_code == 200
        assert response.json() == CACHED_BENEFITS
        mock_list.assert_not_called()
