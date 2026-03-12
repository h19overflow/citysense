"""LangChain tool registry for the career agent."""

from backend.agents.career.tools.course_tools import search_upskill_resources
from backend.agents.career.tools.gap_tools import compute_skill_gaps
from backend.agents.career.tools.job_tools import search_local_jobs, search_web_jobs

CAREER_TOOLS = [
    search_local_jobs,
    search_web_jobs,
    compute_skill_gaps,
    search_upskill_resources,
]
