"""Bright Data crawl tool for growth plan agents."""

import logging
from typing import Literal

import httpx
from langchain_core.tools import tool

from backend.config import get_api_key

logger = logging.getLogger(__name__)

_BRIGHTDATA_CRAWL_URL = "https://api.brightdata.com/request"
_DEPTH_TOKEN_LIMITS: dict[str, int] = {"surface": 2000, "medium": 6000, "deep": 15000}


@tool
async def crawl_page(url: str, depth_hint: Literal["surface", "medium", "deep"] = "medium") -> str:
    """Crawl a URL using Bright Data and return the extracted text content.

    Args:
        url: The URL to crawl.
        depth_hint: Controls how much content to return.

    Returns:
        Extracted text content from the page, truncated by depth.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _BRIGHTDATA_CRAWL_URL,
                headers={
                    "Authorization": f"Bearer {get_api_key()}",
                    "Content-Type": "application/json",
                },
                json={"url": url, "format": "markdown", "zone": "datacenter_proxy"},
            )
            response.raise_for_status()
            content = _extract_content(response.json())
            return _truncate_by_depth(content, depth_hint)
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Crawl HTTP error for %s: %s",
            url,
            exc.response.status_code,
            extra={"operation": "crawl_page", "url": url},
        )
        return f"[Crawl failed for {url}: HTTP {exc.response.status_code}]"
    except (httpx.HTTPError, httpx.TimeoutException, OSError) as exc:
        logger.warning(
            "Crawl network error for %s: %s",
            url,
            exc,
            extra={"operation": "crawl_page", "url": url},
        )
        return f"[Crawl failed for {url}: {exc}]"


def _extract_content(response_data: dict) -> str:
    """Extract text content from Bright Data crawl response."""
    return (
        response_data.get("content")
        or response_data.get("markdown")
        or response_data.get("text")
        or str(response_data)
    )


def _truncate_by_depth(content: str, depth_hint: str) -> str:
    """Truncate content based on crawl depth to control token usage."""
    limit = _DEPTH_TOKEN_LIMITS.get(depth_hint, 6000)
    return content[:limit]
