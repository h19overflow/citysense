"""Pre-Crawl Strategist Agent — generates personalized CrawlStrategy per URL."""

import asyncio
import logging

import httpx
from langchain_core.messages import HumanMessage

from backend.agents.common.llm import build_llm
from backend.agents.growth.prompts import STRATEGIST_PROMPT
from backend.agents.growth.schemas import CrawlStrategy, StrategistOutput

logger = logging.getLogger(__name__)

_MAX_HEADER_BYTES = 4096


def build_strategist_chain():
    """Build a structured-output chain for the strategist agent."""
    llm = build_llm(model="gemini-3.1-flash-lite-preview", temperature=0.3)
    return llm.with_structured_output(StrategistOutput)


async def fetch_link_header(url: str) -> str:
    """Fetch the first 4KB of a URL to get title and meta description."""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            return response.text[:_MAX_HEADER_BYTES]
    except Exception as exc:
        logger.warning("Header fetch failed for %s: %s", url, exc)
        return f"[Could not fetch header for {url}]"


async def run_strategist_agent(
    urls: list[str],
    cv_summary: dict,
    career_goal: str,
    target_timeline: str,
) -> list[CrawlStrategy]:
    """Fetch all link headers in parallel then run one LLM call to generate strategies."""
    if not urls:
        return []
    headers = await asyncio.gather(*[fetch_link_header(url) for url in urls])
    prompt = _build_strategist_prompt(urls, headers, cv_summary, career_goal, target_timeline)
    chain = build_strategist_chain()

    try:
        result: StrategistOutput = await chain.ainvoke([HumanMessage(content=prompt)])
        return result.strategies
    except Exception as exc:
        logger.error("Strategist agent failed: %s", exc, extra={"operation": "run_strategist_agent"})
        return _build_fallback_strategies(urls)


def _build_strategist_prompt(
    urls: list[str],
    headers: list[str],
    cv_summary: dict,
    career_goal: str,
    target_timeline: str,
) -> str:
    """Assemble the full strategist prompt with user context and link headers."""
    skills = ", ".join(cv_summary.get("skills", []))
    tools = ", ".join(cv_summary.get("tools", []))
    roles = ", ".join(cv_summary.get("roles", []))
    experience = cv_summary.get("experience_summary", "Not provided")

    links_section = "\n".join(
        f"URL {i+1}: {url}\nHeader preview:\n{header}\n"
        for i, (url, header) in enumerate(zip(urls, headers))
    )

    return (
        f"USER PROFILE\n"
        f"Skills: {skills or 'Not specified'}\n"
        f"Tools: {tools or 'Not specified'}\n"
        f"Roles: {roles or 'Not specified'}\n"
        f"Experience: {experience}\n\n"
        f"Career goal: {career_goal}\n"
        f"Timeline: {target_timeline}\n\n"
        f"LINKS TO ANALYZE\n{links_section}"
    )


def _build_fallback_strategies(urls: list[str]) -> list[CrawlStrategy]:
    """Return surface-level fallback strategies when the strategist fails."""
    return [
        CrawlStrategy(
            url=url,
            link_type="other",
            depth="surface",
            focus_areas=["Extract title, summary, and key topics"],
            why="Fallback strategy — strategist agent unavailable",
        )
        for url in urls
    ]
