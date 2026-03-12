from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import backend.agents.career.agent as career_agent_module
from backend.agents.career.schemas import CareerAgentResponse


def test_build_career_agent_returns_agent():
    with patch("backend.agents.career.agent.build_llm") as mock_llm, \
         patch("backend.agents.career.agent.create_agent") as mock_create:
        mock_create.return_value = MagicMock()
        career_agent_module._cached_agent = None  # reset singleton
        agent = career_agent_module.build_career_agent()
        assert agent is not None
        mock_llm.assert_called_once()


def test_build_career_agent_is_cached():
    with patch("backend.agents.career.agent.build_llm"), \
         patch("backend.agents.career.agent.create_agent") as mock_create:
        mock_create.return_value = MagicMock()
        career_agent_module._cached_agent = None  # reset singleton
        agent1 = career_agent_module.build_career_agent()
        agent2 = career_agent_module.build_career_agent()
        assert agent1 is agent2
        mock_create.assert_called_once()  # only built once


@pytest.mark.asyncio
async def test_run_career_analysis_returns_response():
    from backend.agents.career.agent import run_career_analysis

    mock_cv = MagicMock()
    mock_cv.skills = ["Python", "SQL"]
    mock_cv.roles = ["Data Analyst"]
    mock_cv.experience = []
    mock_cv.tools = ["Excel"]

    mock_profile = MagicMock()
    mock_profile.job_title = "Junior Analyst"
    mock_profile.salary = "45000"

    mock_response = CareerAgentResponse(
        summary="Great fit for data roles.",
        job_opportunities=[],
        skill_gaps=[],
        upskill_resources=[],
        next_role_target="Senior Data Analyst",
        chips=["What should I learn?"],
    )

    with patch("backend.agents.career.agent.build_career_agent") as mock_build:
        mock_agent = AsyncMock()
        mock_agent.ainvoke.return_value = {
            "structured_response": mock_response,
            "messages": [],
        }
        mock_build.return_value = mock_agent
        result = await run_career_analysis(mock_cv, mock_profile)
        assert result["summary"] == "Great fit for data roles."
        assert result["next_role_target"] == "Senior Data Analyst"
