from unittest.mock import MagicMock, patch

from backend.agents.career.tools.registry import CAREER_TOOLS


def test_career_tools_registered():
    tool_names = [t.name for t in CAREER_TOOLS]
    assert "search_local_jobs" in tool_names
    assert "search_web_jobs" in tool_names
    assert "compute_skill_gaps" in tool_names
    assert "search_upskill_resources" in tool_names


def test_search_web_jobs_calls_serp():
    from backend.agents.career.tools.job_tools import search_web_jobs
    with patch("backend.agents.common.web_search.search_montgomery_web") as mock_search:
        mock_search.return_value = "2 results found"
        result = search_web_jobs.invoke({"roles": "Data Analyst", "skills": "Python, SQL"})
        assert mock_search.called
        assert isinstance(result, str)


def test_compute_skill_gaps_returns_string():
    from backend.agents.career.tools.gap_tools import compute_skill_gaps
    result = compute_skill_gaps.invoke({
        "current_skills": "Python, Excel",
        "target_role": "Data Scientist",
    })
    assert isinstance(result, str)
    assert len(result) > 0


def test_search_upskill_resources_calls_serp():
    from backend.agents.career.tools.course_tools import search_upskill_resources
    with patch("backend.agents.common.web_search.search_montgomery_web") as mock_search:
        mock_search.return_value = "Trenholm State offers Docker courses"
        result = search_upskill_resources.invoke({"skill": "Docker"})
        assert mock_search.called
        assert isinstance(result, str)
