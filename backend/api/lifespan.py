"""Application lifespan — startup/shutdown hooks for the FastAPI app.

Manages background scraping and verifies infrastructure connections
(Redis, Celery broker) on startup.
"""

from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Run startup tasks, yield, then run shutdown tasks."""
    scraper_task = _start_scraper_if_enabled()
    await asyncio.to_thread(_verify_redis_connection)
    await asyncio.to_thread(_verify_celery_broker)

    yield

    if scraper_task:
        scraper_task.cancel()


def _start_scraper_if_enabled() -> asyncio.Task | None:
    """Start background scraping if AUTO_SCRAPE is set and API key exists."""
    auto_scrape = os.environ.get("AUTO_SCRAPE", "0") != "0"
    has_api_key = bool(os.environ.get("BRIGHTDATA_API_KEY"))

    if not (auto_scrape and has_api_key):
        return None

    from backend.core.data_scraping.scheduler import start_scheduled_scraping

    logger.info("Starting background scraper")
    return asyncio.create_task(start_scheduled_scraping())


def _verify_redis_connection() -> None:
    """Log Redis connectivity status on startup (runs in thread pool)."""
    from backend.core.redis_client import cache

    if cache.is_available():
        logger.info("Redis connection verified")
    else:
        logger.warning("Redis unavailable — job tracking and caching disabled")


def _verify_celery_broker() -> None:
    """Verify the Celery broker is reachable (runs in thread pool)."""
    try:
        from backend.workers.celery_app import app as celery_app

        conn = celery_app.connection()
        conn.ensure_connection(max_retries=1, timeout=3)
        conn.close()
        logger.info("Celery broker connection verified")
    except (ConnectionError, OSError, ConnectionRefusedError) as exc:
        logger.warning("Celery broker unreachable — background tasks disabled: %s", exc)
