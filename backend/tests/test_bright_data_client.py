"""Unit tests for backend/core/bright_data_client.py.

Tests cover pure logic that does not require a real Bright Data API key.
External calls are patched to avoid network I/O.
"""

import asyncio
from unittest.mock import MagicMock, patch

import pytest

from backend.core.data_scraping.bright_data_client import _run_async, serp_search, serp_maps_search


# ---------------------------------------------------------------------------
# _run_async
# ---------------------------------------------------------------------------

def test_run_async_executes_coroutine_outside_event_loop() -> None:
    """_run_async should run a coroutine and return its result synchronously."""
    async def return_value() -> int:
        return 42

    result = _run_async(return_value())
    assert result == 42


def test_run_async_handles_running_loop() -> None:
    """_run_async should use a thread pool when a loop is already running."""
    async def inner() -> str:
        async def nested() -> str:
            return "nested"
        return _run_async(nested())

    result = asyncio.run(inner())
    assert result == "nested"


# ---------------------------------------------------------------------------
# serp_search
# ---------------------------------------------------------------------------

def test_serp_search_returns_none_when_serp_request_fails() -> None:
    """serp_search should return None when the underlying request returns None."""
    with patch("backend.core.data_scraping.bright_data_client._serp_request", return_value=None):
        result = serp_search("montgomery county jobs")
    assert result is None


def test_serp_search_returns_results_list_when_organic_present() -> None:
    """serp_search should extract and return organic results from the response."""
    fake_response = {"organic": [{"title": "Job A"}, {"title": "Job B"}]}
    with patch("backend.core.data_scraping.bright_data_client._serp_request", return_value=fake_response):
        result = serp_search("jobs")
    assert result is not None
    assert result["total"] == 2
    assert len(result["results"]) == 2


def test_serp_search_falls_back_to_raw_body_when_no_known_key() -> None:
    """serp_search should return the raw body when no recognized result key exists."""
    fake_response = {"some_other_key": "data"}
    with patch("backend.core.data_scraping.bright_data_client._serp_request", return_value=fake_response):
        result = serp_search("query")
    assert result == fake_response


def test_serp_search_news_type_appends_tbm_param() -> None:
    """serp_search with search_type='nws' should include tbm=nws in the URL."""
    captured_urls: list[str] = []

    def capture_url(url: str) -> dict:
        captured_urls.append(url)
        return None  # type: ignore[return-value]

    with patch("backend.core.data_scraping.bright_data_client._serp_request", side_effect=capture_url):
        serp_search("news query", search_type="nws")

    assert len(captured_urls) == 1
    assert "tbm=nws" in captured_urls[0]


# ---------------------------------------------------------------------------
# serp_maps_search
# ---------------------------------------------------------------------------

def test_serp_maps_search_returns_none_when_request_fails() -> None:
    """serp_maps_search should return None when the underlying request returns None."""
    with patch("backend.core.data_scraping.bright_data_client._serp_request", return_value=None):
        result = serp_maps_search("restaurants montgomery")
    assert result is None


def test_serp_maps_search_returns_local_results() -> None:
    """serp_maps_search should extract local_results from the response."""
    fake_response = {"local_results": [{"name": "Place A"}]}
    with patch("backend.core.data_scraping.bright_data_client._serp_request", return_value=fake_response):
        result = serp_maps_search("coffee shops")
    assert result is not None
    assert result["total"] == 1
