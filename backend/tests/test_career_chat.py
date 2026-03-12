"""Tests for career chat API endpoint."""

from unittest.mock import AsyncMock, patch

from backend.tests.conftest import test_client  # noqa: F401


def test_career_chat_returns_response(test_client):
    mock_result = {
        "summary": "You are on track.",
        "job_opportunities": [],
        "skill_gaps": [],
        "upskill_resources": [],
        "next_role_target": "Data Scientist",
        "chips": ["Tell me more"],
    }
    with patch(
        "backend.api.routers.career_chat.handle_career_chat",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        response = test_client.post(
            "/api/career/chat",
            json={
                "message": "What should I focus on?",
                "career_context_id": "ctx-123",
                "citizen_id": "user-456",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["next_role_target"] == "Data Scientist"


def test_career_chat_missing_message_returns_422(test_client):
    response = test_client.post(
        "/api/career/chat",
        json={"career_context_id": "ctx-123", "citizen_id": "user-456"},
    )
    assert response.status_code == 422
