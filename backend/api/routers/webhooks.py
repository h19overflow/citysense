"""Webhook endpoints for Bright Data scrape deliveries."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from backend.api.deps import verify_webhook_secret
from backend.api.schemas.webhook_schemas import JobRecord, NewsWebhookBody, ZillowListing
from backend.config import RAW_DIR
from backend.core.data_scraping.scrapers.jobs import JobsScraper
from backend.core.data_scraping.scrapers.news import NewsScraper
from backend.core.data_scraping.scrapers.housing import HousingScraper

router = APIRouter(prefix="/webhook", tags=["webhooks"])
logger = logging.getLogger(__name__)


def save_raw_webhook(stream_type: str, data: list | dict) -> None:
    """Save raw webhook payload for debugging. Logs and skips on IO failure."""
    try:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        path = RAW_DIR / f"webhook_{stream_type}_{timestamp}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except OSError:
        logger.warning("Could not save raw webhook payload for stream '%s'", stream_type)


# ---------------------------------------------------------------------------
# Background processing helpers
# ---------------------------------------------------------------------------

def _process_jobs_background(valid_jobs: list[dict]) -> None:
    """Process job records in background (includes geocoding with sleeps)."""
    try:
        scraper = JobsScraper()
        features = scraper.process(valid_jobs)
        existing = scraper.load_existing()
        merged = scraper.deduplicate(features, existing)
        scraper.save(merged)
        scraper.broadcast(features)
        logger.info("Jobs webhook background processing complete: %d features", len(features))
    except Exception:
        logger.exception("Jobs webhook background processing failed")


def _process_news_background(raw_articles: list[dict]) -> None:
    """Process news articles in background (includes geocoding with sleeps)."""
    try:
        scraper = NewsScraper()
        articles = scraper.process(raw_articles)
        existing = scraper.load_existing()
        merged = scraper.deduplicate(articles, existing)
        scraper.save(merged)
        scraper.broadcast(articles)
        logger.info("News webhook background processing complete: %d articles", len(articles))
    except Exception:
        logger.exception("News webhook background processing failed")


def _process_housing_background(raw_listings: list[dict]) -> None:
    """Process housing listings in background (includes geocoding with sleeps)."""
    try:
        scraper = HousingScraper()
        features = scraper.process(raw_listings)
        existing = scraper.load_existing()
        merged = scraper.deduplicate(features, existing)
        scraper.save(merged)
        scraper.broadcast(features)
        logger.info("Housing webhook background processing complete: %d features", len(features))
    except Exception:
        logger.exception("Housing webhook background processing failed")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/jobs")
async def webhook_jobs(
    request: Request,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_webhook_secret),
) -> JSONResponse:
    """Receive job scraper results from Bright Data."""
    try:
        raw_body = await request.json()
    except json.JSONDecodeError as e:
        logger.warning("Jobs webhook received invalid JSON: %s", e)
        return JSONResponse(status_code=422, content={"error": "invalid_json", "detail": str(e)})

    try:
        raw_jobs = [JobRecord.model_validate(item).model_dump() for item in raw_body]
    except (ValidationError, TypeError) as e:
        logger.warning("Jobs webhook payload validation failed: %s", e)
        return JSONResponse(status_code=422, content={"error": "validation_failed", "detail": str(e)})

    save_raw_webhook("jobs", raw_jobs)
    valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
    for job in valid:
        job["_source"] = "webhook"
    background_tasks.add_task(_process_jobs_background, valid)
    return JSONResponse({"ok": True, "accepted": len(valid)})


@router.post("/news")
async def webhook_news(
    request: Request,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_webhook_secret),
) -> JSONResponse:
    """Receive SERP news results from Bright Data."""
    try:
        raw_body = await request.json()
    except json.JSONDecodeError as e:
        logger.warning("News webhook received invalid JSON: %s", e)
        return JSONResponse(status_code=422, content={"error": "invalid_json", "detail": str(e)})

    try:
        raw_data = NewsWebhookBody.model_validate(raw_body).model_dump()
    except (ValidationError, TypeError) as e:
        logger.warning("News webhook payload validation failed: %s", e)
        return JSONResponse(status_code=422, content={"error": "validation_failed", "detail": str(e)})

    save_raw_webhook("news", raw_data)
    scraper = NewsScraper()
    raw_articles = scraper._parse_serp_results(raw_data, category="general")
    background_tasks.add_task(_process_news_background, raw_articles)
    return JSONResponse({"ok": True, "accepted": len(raw_articles)})


@router.post("/housing")
async def webhook_housing(
    request: Request,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_webhook_secret),
) -> JSONResponse:
    """Receive Zillow listing results from Bright Data."""
    try:
        raw_body = await request.json()
    except json.JSONDecodeError as e:
        logger.warning("Housing webhook received invalid JSON: %s", e)
        return JSONResponse(status_code=422, content={"error": "invalid_json", "detail": str(e)})

    try:
        raw_listings = [ZillowListing.model_validate(item).model_dump() for item in raw_body]
    except (ValidationError, TypeError) as e:
        logger.warning("Housing webhook payload validation failed: %s", e)
        return JSONResponse(status_code=422, content={"error": "validation_failed", "detail": str(e)})

    save_raw_webhook("housing", raw_listings)
    background_tasks.add_task(_process_housing_background, raw_listings)
    return JSONResponse({"ok": True, "accepted": len(raw_listings)})
