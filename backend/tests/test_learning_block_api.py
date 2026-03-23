"""Tests for the on-demand LearningBlock expansion endpoint."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.agents.growth.schemas import LearningBlock, Phase, PhaseTask
from backend.api.main import app


def _make_block() -> LearningBlock:
    return LearningBlock(
        skill_name="Kubernetes",
        why_this_matters="Container orchestration for your deployment goals",
        total_time="~12 hours",
        not_yet=["Helm charts"],
        phases=[
            Phase(
                name="Understand",
                time_estimate="Days 1-3",
                tasks=[PhaseTask(action="Read", instruction="K8s docs getting started")],
                stop_signal="Can explain pods and deployments",
                anti_patterns=["Don't jump to Helm"],
            ),
        ],
        prerequisites=["Docker"],
    )


@pytest.mark.asyncio
@patch("backend.api.routers.learning_block._load_intake_preferences", return_value={"career_goal": "Engineer", "learning_style": "hands-on", "target_timeline": "6 months"})
@patch("backend.api.routers.learning_block.generate_single_learning_block")
@patch("backend.api.routers.learning_block._load_analysis_path")
async def test_expand_learning_block(mock_load, mock_gen, mock_prefs):
    mock_analysis = MagicMock(intake_id="test-intake-id")
    mock_load.return_value = {
        "path": {
            "skill_steps": [
                {"skill": "Docker", "why": "Deployment"},
                {"skill": "Kubernetes", "why": "Orchestration"},
            ],
        },
        "analysis": mock_analysis,
    }
    mock_gen.return_value = _make_block()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/growth/learning-block/expand", json={
            "analysis_id": "test-analysis-id",
            "path_key": "fill_gap",
            "citizen_id": "test-citizen-id",
            "skill_index": 1,
        })

    assert response.status_code == 200
    data = response.json()
    assert data["skill_name"] == "Kubernetes"
    assert len(data["phases"]) == 1


@pytest.mark.asyncio
@patch("backend.api.routers.learning_block._load_analysis_path")
async def test_expand_invalid_index(mock_load):
    mock_analysis = MagicMock(intake_id="test-intake-id")
    mock_load.return_value = {
        "path": {"skill_steps": [{"skill": "Docker", "why": "Deployment"}]},
        "analysis": mock_analysis,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/growth/learning-block/expand", json={
            "analysis_id": "test-id",
            "path_key": "fill_gap",
            "citizen_id": "test-citizen",
            "skill_index": 5,
        })

    assert response.status_code == 400
