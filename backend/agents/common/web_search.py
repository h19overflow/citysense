"""Shared web search tool for all agents.

Uses Bright Data SERP zone scoped to Montgomery, Alabama.
"""

import logging

from backend.core.bright_data_client import serp_search

logger = logging.getLogger("web_search")

MONTGOMERY_SUFFIX = " Montgomery Alabama"
MAX_RESULTS = 5


def search_montgomery_web(query: str, max_results: int = MAX_RESULTS) -> str:
    """Search the web for Montgomery-specific information.

    Uses regular web search (not news) for better service results.
    Automatically appends 'Montgomery Alabama' to the query.
    """
    scoped_query = query.strip()
    if "montgomery" not in scoped_query.lower():
        scoped_query += MONTGOMERY_SUFFIX

    try:
        data = serp_search(scoped_query, search_type="web")
    except Exception as e:
        logger.error("SERP search failed for '%s': %s", scoped_query, e)
        return f"Web search unavailable: {e}"

    if not data or not data.get("results"):
        return f"No web results found for: {scoped_query}"

    results = data["results"][:max_results]
    lines = [f"Web results for '{scoped_query}' ({len(results)} shown):"]
    for r in results:
        title = r.get("title", "Untitled")
        snippet = r.get("description", r.get("snippet", ""))[:300]
        source = r.get("source", r.get("displayed_link", ""))
        url = r.get("link", r.get("url", ""))
        entry = f"- {title}\n  {snippet}"
        if url:
            entry += f"\n  URL: {url}"
        if source:
            entry += f"\n  Source: {source}"
        lines.append(entry)

    return "\n".join(lines)
