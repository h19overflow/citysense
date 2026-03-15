"""LangChain tool registry for the career agent."""

from backend.agents.career.tools.job_tools import search_local_jobs, search_web_jobs
from backend.agents.career.tools.roadmap_tools import build_patch_roadmap_tool

CAREER_TOOLS = [
    search_local_jobs,
    search_web_jobs,
]


def build_growth_tools(analysis_id: str, path_key: str, citizen_id: str) -> list:
    """Build tool list for Growth Guide mode."""
    return [build_patch_roadmap_tool(analysis_id, path_key, citizen_id)]
