"""Per-URL Crawl Agent — parameterized by CrawlStrategy, runs in parallel."""

import asyncio
import logging
from typing import Any

from langchain_core.messages import AIMessage
from langchain.agents import create_agent

from backend.agents.common.llm import build_llm
from backend.agents.growth.prompts import CRAWL_AGENT_PROMPT
from backend.agents.growth.schemas import CrawlResult, CrawlStrategy
from backend.agents.growth.tools.registry import CRAWL_TOOLS

logger = logging.getLogger(__name__)

_cached_crawl_agent: Any = None


def get_crawl_agent() -> Any:
    """Return the cached crawl agent, building once on first call."""
    global _cached_crawl_agent
    if _cached_crawl_agent is None:
        llm = build_llm(model="gemini-3.1-flash-lite-preview", temperature=0.2)
        _cached_crawl_agent = create_agent(
            model=llm,
            tools=CRAWL_TOOLS,
            system_prompt=CRAWL_AGENT_PROMPT,
        )
    return _cached_crawl_agent


async def run_crawl_agent(strategy: CrawlStrategy) -> CrawlResult:
    """Run a single crawl agent for one URL using its personalized strategy.

    Args:
        strategy: CrawlStrategy with url, depth, and focus_areas.

    Returns:
        CrawlResult with extracted signals and raw summary.
    """
    agent = get_crawl_agent()
    prompt = _build_crawl_prompt(strategy)

    try:
        result = await agent.ainvoke({"messages": [("human", prompt)]})
        return _extract_crawl_result(strategy, result)
    except (ValueError, RuntimeError) as exc:
        logger.warning(
            "Crawl agent failed for %s: %s",
            strategy.url,
            exc,
            extra={"operation": "run_crawl_agent", "url": strategy.url},
        )
        return CrawlResult(
            url=strategy.url,
            link_type=strategy.link_type,
            signals=[],
            raw_summary=f"[Crawl failed: {exc}]",
        )


async def run_all_crawl_agents(strategies: list[CrawlStrategy]) -> list[CrawlResult]:
    """Launch one crawl agent per strategy in parallel via asyncio.gather.

    Args:
        strategies: List of CrawlStrategy — one per URL.

    Returns:
        List of CrawlResult in the same order as strategies.
    """
    if not strategies:
        return []
    results = await asyncio.gather(
        *[run_crawl_agent(s) for s in strategies],
        return_exceptions=False,
    )
    return list(results)


def _build_crawl_prompt(strategy: CrawlStrategy) -> str:
    """Build the per-URL crawl prompt with personalized focus areas."""
    focus = "\n".join(f"- {area}" for area in strategy.focus_areas)
    return (
        f"URL: {strategy.url}\n"
        f"Link type: {strategy.link_type}\n"
        f"Crawl depth: {strategy.depth}\n\n"
        f"Focus areas (personalized):\n{focus}\n\n"
        f"Reason for these focus areas: {strategy.why}\n\n"
        f"Use the crawl_page tool with depth_hint='{strategy.depth}' on this URL. "
        f"Extract signals that match the focus areas. Be specific — facts not summaries."
    )


def _extract_crawl_result(strategy: CrawlStrategy, agent_result: dict[str, Any]) -> CrawlResult:
    """Parse the agent's final message into a CrawlResult."""
    messages = agent_result.get("messages", [])
    final_content = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            final_content = msg.content if isinstance(msg.content, str) else str(msg.content)
            break

    lines = [line.strip() for line in final_content.split("\n") if line.strip()]
    signals = [line.lstrip("- ") for line in lines if line.startswith("-")][:20]

    return CrawlResult(
        url=strategy.url,
        link_type=strategy.link_type,
        signals=signals or [final_content[:200]],
        raw_summary=final_content[:3000],
    )
