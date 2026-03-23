"""LangChain tool registry for the career agent."""

from backend.agents.career.tools.job_tools import search_local_jobs, search_web_jobs

CAREER_TOOLS = [
    search_local_jobs,
    search_web_jobs,
]
