"""Background scrape scheduler — runs registered scrapers on a configurable interval.

Each scraper runs in a thread pool to avoid blocking the async event loop.
"""

import asyncio
import logging
import os
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

logger = logging.getLogger("scrape_scheduler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

SCRAPE_INTERVAL_SECONDS = int(os.environ.get("SCRAPE_INTERVAL", "900"))
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="scraper")


def _build_scraper_registry() -> list:
    """Lazy import to avoid circular imports at module load time."""
    from backend.core.data_scraping.scrapers.jobs import JobsScraper
    from backend.core.data_scraping.scrapers.news import NewsScraper
    from backend.core.data_scraping.scrapers.housing import HousingScraper
    from backend.core.data_scraping.scrapers.benefits import BenefitsScraper

    return [JobsScraper(), NewsScraper(), HousingScraper(), BenefitsScraper()]


async def _run_scraper_in_thread(scraper) -> None:
    """Run a blocking scraper.run() in the thread pool."""
    loop = asyncio.get_event_loop()
    try:
        count = await loop.run_in_executor(_executor, scraper.run)
        logger.info("Scraper '%s' completed: %d items", scraper.name, count)
    except Exception:
        logger.error("Scraper '%s' failed:\n%s", scraper.name, traceback.format_exc())


async def run_all_scrapers() -> None:
    """Run all registered scrapers concurrently (each in its own thread)."""
    scrapers = _build_scraper_registry()
    logger.info("Starting all scrapers at %s", datetime.now(timezone.utc).isoformat())
    tasks = [_run_scraper_in_thread(s) for s in scrapers]
    await asyncio.gather(*tasks)
    logger.info("All scrapers complete")


async def start_scheduled_scraping() -> None:
    """Run scrapers on startup and then repeat on interval."""
    scrapers = _build_scraper_registry()
    logger.info(
        "Scheduler started — interval=%ds, scrapers=%s",
        SCRAPE_INTERVAL_SECONDS,
        [s.name for s in scrapers],
    )

    while True:
        await run_all_scrapers()
        logger.info("Next scrape in %d seconds", SCRAPE_INTERVAL_SECONDS)
        await asyncio.sleep(SCRAPE_INTERVAL_SECONDS)
