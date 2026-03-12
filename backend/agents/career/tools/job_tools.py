"""Tools for searching local DB and web job listings."""

import asyncio

from langchain_core.tools import tool

from backend.agents.common import web_search


@tool
def search_local_jobs(roles: str, skills: str) -> str:
    """Search the Montgomery job listings database for roles matching a citizen's CV.

    Args:
        roles: Comma-separated job title candidates from the CV (e.g. "Data Analyst, Accountant").
        skills: Comma-separated skills from the CV (e.g. "Python, Excel, SQL").

    Returns plain-text list of matching jobs with title, company, and address.
    """
    from backend.db.crud.jobs import search_jobs_by_roles_and_skills
    results = asyncio.run(search_jobs_by_roles_and_skills(roles=roles, skills=skills))
    if not results:
        return "No matching jobs found in local database."
    lines = [f"Local DB jobs ({len(results)} found):"]
    for job in results[:10]:
        lines.append(f"- {job.title} at {job.company} — {job.address or 'Montgomery, AL'}")
    return "\n".join(lines)


@tool
def search_web_jobs(roles: str, skills: str) -> str:
    """Search the web for job openings in Montgomery AL matching the citizen's roles and skills.

    Args:
        roles: Job roles to search for (e.g. "Data Analyst").
        skills: Key skills to include in search (e.g. "Python SQL").

    Returns plain-text web search results with job titles, companies, and URLs.
    """
    query = f"{roles} jobs hiring {skills}"
    return web_search.search_montgomery_web(query)
