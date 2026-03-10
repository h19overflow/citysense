"""Background scrape scheduler that runs inside the webhook server.

On startup, triggers all 4 Bright Data streams immediately, then repeats
on a configurable interval. Uses poll mode (synchronous download) since
localhost isn't reachable from Bright Data's servers.

Each stream runs in a thread to avoid blocking the async event loop.
Results are fed through the same processor → save → SSE broadcast pipeline.
"""

import asyncio
import logging
import os
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from backend.core.sse_broadcaster import broadcast_event_threadsafe as broadcast_event

logger = logging.getLogger("scrape_scheduler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

# Default: refresh every 15 minutes. Override via env var.
SCRAPE_INTERVAL_SECONDS = int(os.environ.get("SCRAPE_INTERVAL", "900"))

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="scraper")


# ---------------------------------------------------------------------------
# Individual stream runners (sync, run in thread pool)
# ---------------------------------------------------------------------------

def _run_jobs_scrape() -> int:
    """Trigger + poll job scrapers. Returns count of features saved."""
    from backend.core.payloads import JOB_SCRAPERS
    from backend.core.bright_data_client import trigger_and_collect
    from backend.processors.process_jobs import (
        detect_source, process_jobs, build_geojson_feature, save_job_results,
    )

    all_features: list[dict] = []
    for scraper in JOB_SCRAPERS:
        logger.info("Jobs: triggering %s", scraper["name"])
        raw_jobs = trigger_and_collect(
            dataset_id=scraper["dataset_id"],
            payload=scraper["payload"],
            params=scraper["params"],
        )
        valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
        processed = process_jobs(valid, scraper["name"])
        for job in processed:
            feat = build_geojson_feature(job)
            if feat:
                all_features.append(feat)

    if all_features:
        save_job_results(all_features)
        broadcast_event("jobs", all_features)
    return len(all_features)


def _load_backend_comments() -> list[dict]:
    """Load citizen comments from exported_comments.json."""
    import json
    from backend.api.routers.comments import COMMENTS_PATH

    if not COMMENTS_PATH.exists():
        return []
    try:
        data = json.loads(COMMENTS_PATH.read_text(encoding="utf-8"))
        return data.get("comments", [])
    except (json.JSONDecodeError, KeyError):
        return []


def _run_comment_analysis() -> None:
    """Run AI comment analysis on articles that have comments, then merge back."""
    from backend.processors.process_news import (
        load_existing_articles, merge_community_sentiment_into_news_feed,
    )
    from backend.processors.analyze_comments import (
        run_batch_analysis, save_analysis_results,
    )

    comments = _load_backend_comments()
    if not comments:
        logger.info("Comment analysis: no comments found, skipping")
        return

    articles = load_existing_articles()
    if not articles:
        logger.info("Comment analysis: no articles found, skipping")
        return

    # Filter to articles that actually have comments
    commented_ids = {c["articleId"] for c in comments}
    articles_with_comments = [a for a in articles if a["id"] in commented_ids]
    if not articles_with_comments:
        logger.info("Comment analysis: no articles with comments, skipping")
        return

    logger.info(
        "Comment analysis: analyzing %d articles with %d comments",
        len(articles_with_comments), len(comments),
    )

    # Safe to call asyncio.run() from ThreadPoolExecutor thread (no running loop)
    results = asyncio.run(run_batch_analysis(articles_with_comments, comments))

    save_analysis_results(results)
    merge_community_sentiment_into_news_feed(results)
    broadcast_event("news_sentiment", {"analyzedArticles": results.total_articles})

    logger.info("Comment analysis: complete — %d articles analyzed", results.total_articles)


def _run_news_scrape() -> int:
    """Run SERP discovery + optional Web Unlocker full-text. Returns article count."""
    from backend.triggers.trigger_news import discover_articles, fetch_full_article_text
    from backend.processors.process_news import (
        enrich_article, deduplicate_articles,
        load_existing_articles, save_news_articles,
    )
    from backend.processors.geocode_news import geocode_articles

    articles = discover_articles()
    if not articles:
        return 0

    # Fetch full text for top articles (limit to 10 to stay fast)
    articles = fetch_full_article_text(articles, max_articles=10)

    for article in articles:
        enrich_article(article)

    articles = geocode_articles(articles)

    existing = load_existing_articles()
    merged = articles + existing
    unique = deduplicate_articles(merged)
    save_news_articles(unique)

    # Broadcast only the new articles (frontend merges client-side)
    broadcast_event("news", articles)

    # Chain AI comment analysis on articles that have community comments
    _run_comment_analysis()

    return len(articles)


def _run_housing_scrape() -> int:
    """Trigger + poll Zillow scraper. Returns listing count."""
    from backend.config import DATASETS
    from backend.core.bright_data_client import trigger_and_collect
    from backend.processors.process_housing import (
        process_zillow_listings, save_housing_results,
    )

    payload = [{"url": "https://www.zillow.com/montgomery-al/rentals/"}]
    params = {"type": "discover_new", "discover_by": "url", "limit_per_input": "100"}

    logger.info("Housing: triggering Zillow")
    raw_listings = trigger_and_collect(
        dataset_id=DATASETS["zillow"],
        payload=payload,
        params=params,
    )
    if not raw_listings:
        return 0

    features = process_zillow_listings(raw_listings)
    save_housing_results(features)
    broadcast_event("housing", features)
    return len(features)


def _run_benefits_scrape() -> int:
    """Scrape benefit eligibility pages via Web Unlocker. Returns service count."""
    from backend.triggers.trigger_benefits import scrape_benefit_pages
    from backend.processors.process_benefits import (
        load_fallback_services, merge_with_fallback, save_benefits,
    )

    live_services = scrape_benefit_pages()
    fallback_services = load_fallback_services()
    merged = merge_with_fallback(live_services, fallback_services)
    save_benefits(merged)
    return len(merged)


# ---------------------------------------------------------------------------
# Stream registry
# ---------------------------------------------------------------------------

STREAMS = [
    ("jobs", _run_jobs_scrape),
    ("news", _run_news_scrape),
    ("housing", _run_housing_scrape),
    ("benefits", _run_benefits_scrape),
]


# ---------------------------------------------------------------------------
# Async scheduler
# ---------------------------------------------------------------------------

async def _run_stream_in_thread(name: str, fn) -> None:
    """Run a blocking scrape function in the thread pool."""
    loop = asyncio.get_event_loop()
    try:
        count = await loop.run_in_executor(_executor, fn)
        logger.info("Stream '%s' completed: %d items", name, count)
    except Exception:
        logger.error("Stream '%s' failed:\n%s", name, traceback.format_exc())


async def run_all_streams() -> None:
    """Run all scrape streams concurrently (each in its own thread)."""
    logger.info("Starting all scrape streams at %s", datetime.now(timezone.utc).isoformat())
    tasks = [_run_stream_in_thread(name, fn) for name, fn in STREAMS]
    await asyncio.gather(*tasks)
    logger.info("All streams complete")


async def start_scheduled_scraping() -> None:
    """Run scrapes on startup and then repeat on interval."""
    logger.info(
        "Scheduler started — interval=%ds, streams=%s",
        SCRAPE_INTERVAL_SECONDS,
        [name for name, _ in STREAMS],
    )

    while True:
        await run_all_streams()
        logger.info("Next scrape in %d seconds", SCRAPE_INTERVAL_SECONDS)
        await asyncio.sleep(SCRAPE_INTERVAL_SECONDS)
