from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.agents.career.agent import build_career_agent
from backend.agents.career.schemas import CareerAgentResponse


def test_build_career_agent_returns_agent():
    agent = build_career_agent()
    assert agent is not None


def test_build_career_agent_is_cached():
    agent1 = build_career_agent()
    agent2 = build_career_agent()
    assert agent1 is agent2


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
