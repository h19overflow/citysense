"""Tool for finding upskilling resources — local-first, web fallback."""

from langchain_core.tools import tool

from backend.agents.common import web_search


@tool
def search_upskill_resources(skill: str) -> str:
    """Find training resources to learn a skill — prioritizes Montgomery AL providers.

    Searches for local options first (Trenholm State, AIDT, workforce programs),
    then falls back to online platforms (Coursera, LinkedIn Learning, etc.).

    Args:
        skill: The skill to find training for (e.g. "Docker", "SQL", "PMP").

    Returns a list of training resources with provider names and URLs where available.
    """
    local_query = f"{skill} training course certification Trenholm State AIDT workforce"
    return web_search.search_montgomery_web(local_query)
