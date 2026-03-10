"""Seed the database from JSON/GeoJSON data files.

Usage: python -m backend.scripts.seed_from_json
"""

import asyncio
import json
import logging
from pathlib import Path

import backend.db.models  # noqa: F401 — registers table metadata on Base
from backend.db.crud.benefits import bulk_upsert_benefits
from backend.db.crud.housing import bulk_upsert_housing
from backend.db.crud.jobs import bulk_upsert_jobs
from backend.db.crud.news import bulk_upsert_articles, bulk_upsert_comments
from backend.db.session import engine, get_session
from backend.scripts.create_tables import create_all_tables
from backend.scripts.seed_converters import (
    article_to_row,
    comment_to_row,
    feature_to_housing_row,
    feature_to_job_row,
    service_to_row,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def deduplicate_by_id(rows: list[dict]) -> list[dict]:
    """Remove duplicate rows by 'id', keeping the last occurrence."""
    seen: dict[str, dict] = {}
    for row in rows:
        seen[row["id"]] = row
    return list(seen.values())

PROJECT_ROOT = Path(__file__).resolve().parents[2]
NEWS_PATH = PROJECT_ROOT / "frontend/public/data/news_feed.json"
COMMENTS_PATH = PROJECT_ROOT / "backend/data/exported_comments.json"
JOBS_PATH = PROJECT_ROOT / "frontend/public/data/jobs.geojson"
HOUSING_PATH = PROJECT_ROOT / "frontend/public/data/housing.geojson"
BENEFITS_PATH = PROJECT_ROOT / "frontend/public/data/gov_services.json"


async def seed_articles() -> None:
    raw = json.loads(NEWS_PATH.read_text(encoding="utf-8"))
    rows = deduplicate_by_id([article_to_row(a) for a in raw.get("articles", [])])
    async with get_session() as session:
        count = await bulk_upsert_articles(session, rows)
    logger.info("articles seeded: %d", count)


async def seed_jobs() -> None:
    raw = json.loads(JOBS_PATH.read_text(encoding="utf-8"))
    rows = deduplicate_by_id([feature_to_job_row(f) for f in raw.get("features", [])])
    async with get_session() as session:
        count = await bulk_upsert_jobs(session, rows)
    logger.info("jobs seeded: %d", count)


async def seed_housing() -> None:
    raw = json.loads(HOUSING_PATH.read_text(encoding="utf-8"))
    rows = deduplicate_by_id([feature_to_housing_row(f) for f in raw.get("features", [])])
    async with get_session() as session:
        count = await bulk_upsert_housing(session, rows)
    logger.info("housing listings seeded: %d", count)


async def seed_benefits() -> None:
    raw = json.loads(BENEFITS_PATH.read_text(encoding="utf-8"))
    rows = deduplicate_by_id([service_to_row(s) for s in raw.get("services", [])])
    async with get_session() as session:
        count = await bulk_upsert_benefits(session, rows)
    logger.info("benefits seeded: %d", count)


async def seed_comments() -> None:
    if not COMMENTS_PATH.exists():
        logger.warning("comments file not found: %s", COMMENTS_PATH)
        return
    raw = json.loads(COMMENTS_PATH.read_text(encoding="utf-8"))
    rows = deduplicate_by_id([comment_to_row(c) for c in raw.get("comments", [])])
    async with get_session() as session:
        count = await bulk_upsert_comments(session, rows)
    logger.info("comments seeded: %d", count)


async def main() -> None:
    await create_all_tables()
    await seed_articles()
    await seed_comments()
    await seed_jobs()
    await seed_housing()
    await seed_benefits()
    await engine.dispose()
    logger.info("seed complete")


if __name__ == "__main__":
    asyncio.run(main())
