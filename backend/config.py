"""Centralized config for all Bright Data scripts.

All credentials from environment variables. No hardcoded fallbacks.
Dataset IDs, file paths, and ArcGIS config live here.
Scraper payloads, queries, and skill categories live in payloads.py.
"""

import os
from pathlib import Path


def require_env(key: str) -> str:
    """Get required env var or raise with helpful message."""
    value = os.environ.get(key)
    if not value:
        raise EnvironmentError(f"Missing required env var: {key}. Check .env file.")
    return value


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

def get_api_key() -> str:
    """Return BRIGHTDATA_API_KEY, raising if unset. Call when actually needed."""
    return require_env("BRIGHTDATA_API_KEY")


WEBHOOK_SECRET: str | None = os.environ.get("WEBHOOK_SECRET")


SERP_ZONE = os.environ.get("BRIGHTDATA_SERP_ZONE", "serp_api1")
UNLOCKER_ZONE = os.environ.get("BRIGHTDATA_UNLOCKER_ZONE", "web_unlocker1")

# ---------------------------------------------------------------------------
# Dataset IDs (Web Scraper API)
# ---------------------------------------------------------------------------

DATASETS = {
    "indeed": "gd_l4dx9j9sscpvs7no2",
    "linkedin": "gd_lpfll7v5hcqtkxl6l",
    "glassdoor_jobs": "gd_lpfbbndm1xnopbrcr0",
    "glassdoor_reviews": "gd_l7j1po0921hbu0ri1z",
    "zillow": "gd_lfqkr8wm13ixtbd8f5",
    "crawl": "gd_m6gjtfmeh43we6cqc",
}

# ---------------------------------------------------------------------------
# ArcGIS
# ---------------------------------------------------------------------------

ARCGIS_BASE = "https://gis.montgomeryal.gov/server/rest/services"

# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DATA = REPO_ROOT / "frontend" / "public" / "data"
SCRIPTS_DATA = Path(__file__).resolve().parent / "data"
RAW_DIR = SCRIPTS_DATA / "raw"

OUTPUT_FILES = {
    "jobs": PUBLIC_DATA / "jobs.geojson",
    "jobs_history": SCRIPTS_DATA / "jobs_history.jsonl",
    "news": PUBLIC_DATA / "news_feed.json",
    "benefits": PUBLIC_DATA / "gov_services.json",
    "housing": PUBLIC_DATA / "housing.geojson",
}
