"""Bright Data API client using the official SDK (brightdata>=0.4).

- Web Scraper API: BrightdataEngine for trigger → poll → fetch
- SERP API: WebUnlocker (same /request endpoint, SERP zone)
- Page fetcher: SDK crawl_single_url
"""

import asyncio
import logging
from typing import Any
from urllib.parse import quote

from brightdata import WebUnlocker, crawl_single_url
from brightdata.webscraper_api.engine import BrightdataEngine, get_engine

from backend.config import get_api_key, SERP_ZONE, DATASETS

logger = logging.getLogger("bright_data_client")


def _get_engine() -> BrightdataEngine:
    return get_engine(token=get_api_key())


def _run_async(coro: Any) -> Any:
    """Run an async coroutine synchronously."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Web Scraper API (trigger → poll → fetch via SDK BrightdataEngine)
# ---------------------------------------------------------------------------

def trigger_and_collect(
    dataset_id: str,
    payload: list[dict],
    params: dict | None = None,
    max_wait: int = 600,
    interval: int = 15,
) -> list[dict]:
    """Trigger a scraper, poll until ready, return results."""
    engine = _get_engine()
    snapshot_id = _run_async(
        engine.trigger(payload=payload, dataset_id=dataset_id, extra_params=params)
    )
    if not snapshot_id:
        return []

    result = _run_async(
        engine.poll_until_ready(snapshot_id, poll_interval=interval, timeout=max_wait)
    )
    if result and result.data:
        return result.data if isinstance(result.data, list) else [result.data]
    return []


def trigger_scraper(
    dataset_id: str,
    payload: list[dict],
    params: dict | None = None,
    webhook_url: str | None = None,
) -> str | None:
    """Trigger a Web Scraper API dataset. Returns snapshot_id or None."""
    engine = _get_engine()
    extra = dict(params) if params else {}
    if webhook_url:
        extra["notify"] = webhook_url
    try:
        return _run_async(
            engine.trigger(payload=payload, dataset_id=dataset_id, extra_params=extra)
        )
    except Exception as e:
        logger.error("Trigger failed: %s", e)
        return None


def poll_snapshot(
    snapshot_id: str,
    max_wait: int = 600,
    interval: int = 15,
) -> list[dict]:
    """Poll until snapshot is ready, then download results."""
    engine = _get_engine()
    result = _run_async(
        engine.poll_until_ready(snapshot_id, poll_interval=interval, timeout=max_wait)
    )
    if result and result.data:
        return result.data if isinstance(result.data, list) else [result.data]
    return []


# ---------------------------------------------------------------------------
# Page fetcher (SDK crawl_single_url)
# ---------------------------------------------------------------------------

def fetch_with_unlocker(
    url: str,
    zone: str | None = None,
    as_markdown: bool = True,
) -> str | None:
    """Fetch a URL via SDK crawl. Returns markdown/HTML or None."""
    try:
        result = crawl_single_url(url, bearer_token=get_api_key())
        if not result:
            return None
        md = result.get_markdown_content()
        if as_markdown and md:
            return md
        page = result.get_page(0) if result.page_count > 0 else None
        if page:
            return page.get("markdown") or page.get("page_html")
        return None
    except Exception as e:
        logger.error("Crawl failed for %s: %s", url, e)
        return None


# ---------------------------------------------------------------------------
# SERP API (uses SDK WebUnlocker with SERP zone)
# ---------------------------------------------------------------------------

def _get_serp_client() -> WebUnlocker:
    """Create a WebUnlocker configured for the SERP zone."""
    return WebUnlocker(
        BRIGHTDATA_WEBUNLOCKER_BEARER=get_api_key(),
        ZONE_STRING=SERP_ZONE,
    )


def _serp_request(google_url: str) -> dict | None:
    """Make a SERP API request via WebUnlocker. Returns parsed JSON or None.

    Falls back to direct HTTP with format=json if WebUnlocker returns HTML.
    """
    client = _get_serp_client()
    try:
        result = client.get_source(google_url)
        if not result.success:
            logger.error("SERP failed: %s", result.error)
            return None
        import json
        return json.loads(result.data)
    except (ValueError, TypeError):
        # WebUnlocker returned HTML — retry with explicit JSON format
        return _serp_request_json(google_url)
    except Exception as e:
        logger.error("SERP request failed for '%s': %s", google_url, e)
        return None


def _serp_request_json(google_url: str) -> dict | None:
    """Direct HTTP SERP request with format=json as fallback."""
    import requests
    payload = {"zone": SERP_ZONE, "url": google_url, "format": "json"}
    headers = {"Authorization": f"Bearer {get_api_key()}", "Content-Type": "application/json"}
    try:
        resp = requests.post("https://api.brightdata.com/request", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # format=json wraps in {status_code, headers, body}
        if "body" in data:
            import json
            return json.loads(data["body"]) if isinstance(data["body"], str) else data["body"]
        return data
    except Exception as e:
        logger.error("SERP JSON fallback failed for '%s': %s", google_url, e)
        return None


def serp_search(
    query: str,
    zone: str | None = None,
    search_type: str = "web",
) -> dict | None:
    """Run a Google search via SERP API. Returns parsed results or None.

    search_type: "web" for regular search, "nws" for news.
    """
    encoded = quote(query)
    tbm_param = f"&tbm={search_type}" if search_type != "web" else ""
    url = (
        f"https://www.google.com/search?"
        f"q={encoded}{tbm_param}&hl=en&gl=us&brd_json=1"
    )
    body = _serp_request(url)
    if not body:
        return None

    results = body.get("organic", body.get("results", body.get("news_results", [])))
    if isinstance(results, list) and len(results) > 0:
        return {"results": results, "total": len(results)}
    return body


def serp_maps_search(query: str, zone: str | None = None) -> dict | None:
    """Run a Google Maps search via SERP API. Returns parsed results or None."""
    encoded = quote(query)
    url = (
        f"https://www.google.com/maps/search/{encoded}/"
        f"@32.3668,-86.3,12z?hl=en&gl=us&brd_json=1"
    )
    body = _serp_request(url)
    if not body:
        return None

    results = body.get("organic", body.get("local_results", body.get("results", body.get("places", []))))
    if isinstance(results, list) and len(results) > 0:
        return {"results": results, "total": len(results)}
    return body
