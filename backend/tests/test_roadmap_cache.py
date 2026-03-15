"""Tests for the in-memory roadmap cache module."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.api.routers.roadmap_cache import (
    _cache,
    get_cached_path,
    ensure_cached,
    invalidate_cache,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Ensure cache is empty before and after each test."""
    _cache.clear()
    yield
    _cache.clear()


def test_get_cached_path_miss():
    """Returns None when cache has no entry for analysis_id."""
    result = get_cached_path("nonexistent-id", "fill_gap")
    assert result is None


def test_get_cached_path_hit():
    """Returns the path dict when present in cache."""
    path_data = {"title": "Fill the Gap", "skills": ["Python"]}
    _cache["analysis-1"] = {
        "path_fill_gap": path_data,
        "path_multidisciplinary": None,
        "path_pivot": None,
        "citizen_id": "cit-1",
    }
    result = get_cached_path("analysis-1", "fill_gap")
    assert result == path_data


def test_get_cached_path_miss_wrong_key():
    """Returns None when analysis exists but path key doesn't."""
    _cache["analysis-1"] = {"path_fill_gap": {"title": "X"}, "citizen_id": "c"}
    result = get_cached_path("analysis-1", "pivot")
    assert result is None


def test_invalidate_cache():
    """Entry is removed after invalidation."""
    _cache["analysis-1"] = {"path_fill_gap": {}, "citizen_id": "c"}
    invalidate_cache("analysis-1")
    assert "analysis-1" not in _cache


def test_invalidate_cache_noop_on_missing():
    """Invalidating a missing key does not raise."""
    invalidate_cache("does-not-exist")  # should not raise


@pytest.mark.asyncio
async def test_ensure_cached_already_present():
    """Does not hit DB when analysis_id is already cached."""
    _cache["analysis-1"] = {"path_fill_gap": {}, "citizen_id": "c"}
    with patch(
        "backend.db.crud.growth.get_roadmap_analysis_by_id",
        new_callable=AsyncMock,
    ) as mock_db:
        await ensure_cached("analysis-1")
        mock_db.assert_not_called()


@pytest.mark.asyncio
async def test_ensure_cached_loads_from_db():
    """Loads from DB on cache miss and populates cache."""
    fake_analysis = MagicMock()
    fake_analysis.path_fill_gap = {"title": "Fill"}
    fake_analysis.path_multidisciplinary = {"title": "Multi"}
    fake_analysis.path_pivot = {"title": "Pivot"}
    fake_analysis.citizen_id = "citizen-abc"

    mock_session = AsyncMock()

    with (
        patch(
            "backend.db.crud.growth.get_roadmap_analysis_by_id",
            new_callable=AsyncMock,
            return_value=fake_analysis,
        ) as mock_crud,
        patch(
            "backend.db.session.AsyncSessionLocal",
            return_value=mock_session,
        ),
    ):
        await ensure_cached("new-analysis")

    assert "new-analysis" in _cache
    assert _cache["new-analysis"]["path_fill_gap"] == {"title": "Fill"}
    assert _cache["new-analysis"]["citizen_id"] == "citizen-abc"
