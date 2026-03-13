"""Pure function — merges List[CrawlResult] into a unified signal dict."""

from typing import Any

from backend.agents.growth.schemas import CrawlResult


def aggregate_crawl_results(results: list[CrawlResult]) -> dict[str, Any]:
    """Merge all crawl results into a flat deduplicated signal dict.

    Args:
        results: List of CrawlResult from parallel crawl agents.

    Returns:
        Dict with keys: signals_by_type, all_signals, summaries_by_url, source_count.
    """
    signals_by_type: dict[str, list[str]] = {}
    all_signals: list[str] = []
    summaries_by_url: dict[str, str] = {}

    for result in results:
        link_type = result.link_type
        if link_type not in signals_by_type:
            signals_by_type[link_type] = []
        signals_by_type[link_type].extend(result.signals)
        all_signals.extend(result.signals)
        summaries_by_url[result.url] = result.raw_summary

    deduplicated_signals = list(dict.fromkeys(all_signals))

    return {
        "signals_by_type": signals_by_type,
        "all_signals": deduplicated_signals,
        "summaries_by_url": summaries_by_url,
        "source_count": len(results),
    }
