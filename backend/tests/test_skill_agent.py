"""Tests for skill agent runner — unit tests with mocked LLM."""

from unittest.mock import AsyncMock, patch

import pytest

from backend.agents.growth.schemas import LearningBlock, Phase, PhaseTask
from backend.agents.growth.skill_agent import run_skill_agent


MOCK_LEARNING_BLOCK = LearningBlock(
    skill_name="Docker",
    why_this_matters="Critical for your deployment goals",
    total_time="~10 hours over 2 weeks",
    not_yet=["Kubernetes"],
    phases=[
        Phase(
            name="Understand",
            time_estimate="Days 1-3",
            tasks=[PhaseTask(action="Read", instruction="Docker docs chapters 1-4")],
            stop_signal="Can explain containers vs VMs",
            anti_patterns=["Don't binge tutorials"],
        ),
    ],
    prerequisites=[],
)


@pytest.mark.asyncio
@patch("backend.agents.growth.skill_agent.build_skill_chain")
async def test_run_skill_agent_returns_learning_block(mock_build):
    mock_chain = AsyncMock()
    mock_chain.ainvoke.return_value = MOCK_LEARNING_BLOCK
    mock_build.return_value = mock_chain

    result = await run_skill_agent(
        skill_name="Docker",
        skill_why="Needed for deployment",
        user_cv_slice={"skills": ["Python"], "roles": ["Developer"]},
        career_goal="Senior Backend Engineer",
        learning_style="hands-on",
        timeline="6 months",
    )

    assert result.skill_name == "Docker"
    assert len(result.phases) == 1
    assert result.not_yet == ["Kubernetes"]


@pytest.mark.asyncio
@patch("backend.agents.growth.skill_agent.build_skill_chain")
async def test_run_skill_agent_error_returns_fallback(mock_build):
    mock_chain = AsyncMock()
    mock_chain.ainvoke.side_effect = RuntimeError("LLM timeout")
    mock_build.return_value = mock_chain

    result = await run_skill_agent(
        skill_name="Docker",
        skill_why="Needed",
        user_cv_slice={},
        career_goal="Engineer",
        learning_style="reading",
        timeline="3 months",
    )

    assert result.skill_name == "Docker"
    assert result.phases == []
    assert "failed" in result.why_this_matters.lower() or "unavailable" in result.why_this_matters.lower()
