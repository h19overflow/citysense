from unittest.mock import patch

from backend.agents.career.tools.registry import CAREER_TOOLS


def test_career_tools_registered():
    tool_names = [t.name for t in CAREER_TOOLS]
    assert "search_local_jobs" in tool_names
    assert "search_web_jobs" in tool_names
    assert len(CAREER_TOOLS) == 2


def test_search_web_jobs_calls_serp():
    from backend.agents.career.tools.job_tools import search_web_jobs
    with patch("backend.agents.common.web_search.search_montgomery_web") as mock_search:
        mock_search.return_value = "2 results found"
        result = search_web_jobs.invoke({"roles": "Data Analyst", "skills": "Python, SQL"})
        assert mock_search.called
        assert isinstance(result, str)
