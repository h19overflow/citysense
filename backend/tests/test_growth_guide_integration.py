"""Integration tests for Growth Guide mode switching in career chat router."""

import pytest
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.api.routers.career_chat import router

MODULE = "backend.api.routers.career_chat"

GROWTH_PAYLOAD = {
    "message": "Help me improve step 2",
    "career_context_id": "ctx-1",
    "citizen_id": "cit-1",
    "growth_mode": True,
    "active_roadmap_analysis_id": "analysis-1",
    "active_roadmap_path_key": "fill_gap",
}

CAREER_PAYLOAD = {
    "message": "What jobs match my skills?",
    "career_context_id": "ctx-1",
    "citizen_id": "cit-1",
}

MOCK_GROWTH_RESULT = {
    "summary": "Great path!",
    "chips": [],
    "job_opportunities": [],
    "updated_path": {"title": "Updated Fill Gap", "steps": []},
}

MOCK_CAREER_RESULT = {
    "summary": "Here are your options.",
    "chips": [],
    "job_opportunities": [],
}


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(router)
    return test_app


@pytest.fixture
def client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _growth_patches():
    """Return context managers for all growth-mode dependencies."""
    return (
        patch(f"{MODULE}.handle_growth_chat", new_callable=AsyncMock, return_value=MOCK_GROWTH_RESULT),
        patch(f"{MODULE}.ensure_cached", new_callable=AsyncMock),
        patch(f"{MODULE}.get_cached_path", return_value={"title": "Test Path"}),
    )


@pytest.mark.asyncio
async def test_growth_mode_calls_handle_growth_chat(client):
    p_growth, p_cache, p_path = _growth_patches()
    with p_growth as mock_growth, p_cache, p_path:
        response = await client.post("/career/chat", json=GROWTH_PAYLOAD)

        assert response.status_code == 200
        mock_growth.assert_called_once()


@pytest.mark.asyncio
async def test_career_mode_calls_handle_career_chat(client):
    with patch(f"{MODULE}.handle_career_chat", new_callable=AsyncMock, return_value=MOCK_CAREER_RESULT) as mock_career:
        response = await client.post("/career/chat", json=CAREER_PAYLOAD)

        assert response.status_code == 200
        mock_career.assert_called_once()


@pytest.mark.asyncio
async def test_growth_mode_ensures_cache(client):
    p_growth, p_cache, p_path = _growth_patches()
    with p_growth, p_cache as mock_cache, p_path:
        response = await client.post("/career/chat", json=GROWTH_PAYLOAD)

        assert response.status_code == 200
        mock_cache.assert_called_once_with("analysis-1")


@pytest.mark.asyncio
async def test_growth_response_includes_updated_path(client):
    p_growth, p_cache, p_path = _growth_patches()
    with p_growth, p_cache, p_path:
        response = await client.post("/career/chat", json=GROWTH_PAYLOAD)

        body = response.json()
        assert "updated_path" in body
        assert body["updated_path"]["title"] == "Updated Fill Gap"
