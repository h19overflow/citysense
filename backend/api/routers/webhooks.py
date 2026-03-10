"""Webhook endpoints for Bright Data scrape deliveries."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
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


@router.post("/jobs")
async def webhook_jobs(
    request: Request,
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

    try:
        save_raw_webhook("jobs", raw_jobs)
        scraper = JobsScraper()
        valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
        for job in valid:
            job["_source"] = "webhook"
        features = scraper.process(valid)
        existing = scraper.load_existing()
        merged = scraper.deduplicate(features, existing)
        scraper.save(merged)
        scraper.broadcast(features)
        return JSONResponse({"ok": True, "processed": len(features)})
    except OSError as e:
        logger.exception("Storage error in jobs webhook")
        return JSONResponse(status_code=500, content={"error": "storage_failed", "detail": str(e)})
    except (ValueError, KeyError, TypeError) as e:
        logger.exception("Processing error in jobs webhook")
        return JSONResponse(status_code=500, content={"error": "processing_failed", "detail": str(e)})


@router.post("/news")
async def webhook_news(
    request: Request,
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

    try:
        save_raw_webhook("news", raw_data)
        scraper = NewsScraper()
        articles = scraper.process([raw_data])
        existing = scraper.load_existing()
        merged = scraper.deduplicate(articles, existing)
        scraper.save(merged)
        scraper.broadcast(articles)
        return JSONResponse({"ok": True, "articles": len(articles)})
    except OSError as e:
        logger.exception("Storage error in news webhook")
        return JSONResponse(status_code=500, content={"error": "storage_failed", "detail": str(e)})
    except (ValueError, KeyError, TypeError) as e:
        logger.exception("Processing error in news webhook")
        return JSONResponse(status_code=500, content={"error": "processing_failed", "detail": str(e)})


@router.post("/housing")
async def webhook_housing(
    request: Request,
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

    try:
        save_raw_webhook("housing", raw_listings)
        scraper = HousingScraper()
        features = scraper.process(raw_listings)
        existing = scraper.load_existing()
        merged = scraper.deduplicate(features, existing)
        scraper.save(merged)
        scraper.broadcast(features)
        return JSONResponse({"ok": True, "listings": len(features)})
    except OSError as e:
        logger.exception("Storage error in housing webhook")
        return JSONResponse(status_code=500, content={"error": "storage_failed", "detail": str(e)})
    except (ValueError, KeyError, TypeError) as e:
        logger.exception("Processing error in housing webhook")
        return JSONResponse(status_code=500, content={"error": "processing_failed", "detail": str(e)})
