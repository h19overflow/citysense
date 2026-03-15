# Data Scraping Consolidation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate 17+ files across `processors/`, `triggers/`, and `core/scrape_scheduler.py` into a modular `core/data_scraping/` package with a Strategy pattern base class.

**Architecture:** Strong `BaseScraper` ABC absorbs all shared logic (dedup, save, broadcast, geocode, ID generation). Each scraper is one self-contained file with `fetch()`, `process()`, `generate_id()`. Scheduler auto-discovers registered scrapers. Comment analysis moves to `agents/`.

**Tech Stack:** Python, FastAPI, Bright Data SDK, Nominatim/ArcGIS geocoding, LangChain/Gemini

---

## Summary of Changes

### Created
- `backend/core/data_scraping/__init__.py`
- `backend/core/data_scraping/base.py` — BaseScraper ABC
- `backend/core/data_scraping/scheduler.py` — replaces `core/scrape_scheduler.py`
- `backend/core/data_scraping/schemas.py` — moved from processors
- `backend/core/data_scraping/scrapers/__init__.py`
- `backend/core/data_scraping/scrapers/jobs.py`
- `backend/core/data_scraping/scrapers/news.py`
- `backend/core/data_scraping/scrapers/housing.py`
- `backend/core/data_scraping/scrapers/benefits.py`
- `backend/core/data_scraping/geo/__init__.py`
- `backend/core/data_scraping/geo/geocoding.py`
- `backend/core/data_scraping/geo/constants.py`
- `backend/agents/comment_analysis.py` — moved from processors

### Modified
- `backend/api/routers/webhooks.py` — update imports
- `backend/api/routers/analysis.py` — update imports
- `backend/api/main.py` — update scheduler import
- `backend/tests/test_processors.py` → `backend/tests/test_scrapers.py` — update imports

### Deleted
- `backend/processors/` — entire directory (11 files)
- `backend/triggers/` — entire directory (5 files)
- `backend/core/scrape_scheduler.py` — replaced

---

## Task 1: Create geo module

**Files:**
- Create: `backend/core/data_scraping/__init__.py`
- Create: `backend/core/data_scraping/geo/__init__.py`
- Create: `backend/core/data_scraping/geo/constants.py`
- Create: `backend/core/data_scraping/geo/geocoding.py`

**Step 1: Create directory structure and constants**

`backend/core/data_scraping/__init__.py`:
```python
"""Data scraping package — Strategy pattern scrapers with shared base class."""
```

`backend/core/data_scraping/geo/__init__.py`:
```python
"""Geocoding utilities for Montgomery, AL."""

from backend.core.data_scraping.geo.geocoding import (
    geocode_nominatim,
    geocode_arcgis_business,
    geocode_serp_maps,
    build_jittered_city_center,
)
from backend.core.data_scraping.geo.constants import (
    MONTGOMERY_CENTER,
    MONTGOMERY_BOUNDS,
    MONTGOMERY_NEIGHBORHOODS,
    MONTGOMERY_LANDMARKS,
    CITY_LEVEL_KEYWORDS,
    LOCATION_PATTERNS,
)
```

`backend/core/data_scraping/geo/constants.py` — copy verbatim from `processors/geocoding_constants.py` (no changes needed, file is 53 lines).

`backend/core/data_scraping/geo/geocoding.py` — consolidate `processors/geocoding_utils.py` + `processors/geocode_news.py` + ArcGIS from `process_jobs.py`:

```python
"""Geocoding helpers: Nominatim, ArcGIS Business License, SERP Maps, jittered fallback."""

import hashlib
import json
import logging
import math
import re
import time
import urllib.parse
import urllib.request

from backend.config import ARCGIS_BASE
from backend.core.data_scraping.geo.constants import (
    MONTGOMERY_CENTER,
    MONTGOMERY_BOUNDS,
    MONTGOMERY_NEIGHBORHOODS,
    MONTGOMERY_LANDMARKS,
    LOCATION_PATTERNS,
    CITY_LEVEL_KEYWORDS,
)

logger = logging.getLogger("geocoding")


# ---------------------------------------------------------------------------
# Nominatim (OSM)
# ---------------------------------------------------------------------------

def geocode_nominatim(address: str) -> tuple[float, float] | None:
    """Geocode via OpenStreetMap Nominatim. Returns (lat, lng) or None."""
    query = urllib.parse.quote(address)
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={query}&format=json&limit=1&countrycodes=us"
    )
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "MontgomeryAI-Hackathon/1.0")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read().decode())
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# ArcGIS Business License (Montgomery GIS)
# ---------------------------------------------------------------------------

def geocode_arcgis_business(company_name: str) -> tuple[float, float, str, str] | None:
    """Search ArcGIS Business Licenses for company coordinates.

    Returns (lat, lng, company_name, address) or None.
    """
    clean = company_name.upper().split(",")[0].strip()
    for suffix in [" INC", " LLC", " CORP", " CO", " LTD"]:
        clean = clean.replace(suffix, "")
    clean = clean.strip()

    if len(clean) < 3:
        return None

    encoded = urllib.parse.quote(clean)
    url = (
        f"{ARCGIS_BASE}/HostedDatasets/Business_License/FeatureServer/0/query"
        f"?where=custCOMPANY_NAME+LIKE+%27%25{encoded}%25%27"
        f"&outFields=custCOMPANY_NAME,Full_Address"
        f"&outSR=4326&f=geojson&resultRecordCount=1"
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            features = data.get("features", [])
            if features:
                coords = features[0]["geometry"]["coordinates"]
                name = features[0]["properties"].get("custCOMPANY_NAME", "")
                addr = features[0]["properties"].get("Full_Address", "")
                return coords[1], coords[0], name, addr
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# SERP Maps (Bright Data Google Maps)
# ---------------------------------------------------------------------------

def is_within_montgomery(lat: float, lng: float) -> bool:
    """Check if coordinates fall within Montgomery metro area."""
    return (
        MONTGOMERY_BOUNDS["lat_min"] <= lat <= MONTGOMERY_BOUNDS["lat_max"]
        and MONTGOMERY_BOUNDS["lng_min"] <= lng <= MONTGOMERY_BOUNDS["lng_max"]
    )


def geocode_serp_maps(location_text: str) -> dict | None:
    """Resolve a location string to coordinates via Google Maps SERP."""
    from backend.core.bright_data_client import serp_maps_search

    query = f"{location_text} Montgomery Alabama"
    body = serp_maps_search(query)

    if not body:
        return None

    results = body.get("results", [])
    if not results:
        return None

    top = results[0]
    coords = top.get("gps_coordinates") or top.get("coordinates") or {}
    lat = coords.get("latitude") or coords.get("lat") or top.get("latitude")
    lng = coords.get("longitude") or coords.get("lng") or top.get("longitude")

    if lat is None or lng is None:
        return None

    lat, lng = float(lat), float(lng)

    if not is_within_montgomery(lat, lng):
        logger.info("Outside bounds: %s → (%s, %s)", location_text, lat, lng)
        return None

    address = top.get("address") or top.get("formatted_address") or ""
    neighborhood = _match_neighborhood(location_text, address)

    return {"lat": lat, "lng": lng, "address": address, "neighborhood": neighborhood}


def _match_neighborhood(query: str, address: str) -> str:
    """Try to match a neighborhood name from query or address."""
    combined = f"{query} {address}".lower()
    for name in MONTGOMERY_NEIGHBORHOODS:
        if name.lower() in combined:
            return name
    return "Montgomery"


# ---------------------------------------------------------------------------
# Jittered city center fallback
# ---------------------------------------------------------------------------

def build_jittered_city_center(article_id: str) -> dict:
    """Generate a deterministic jittered coordinate near city center.

    Uses article ID hash so the same article always gets the same
    position, spreading pins across downtown instead of stacking.
    """
    digest = hashlib.md5(article_id.encode()).hexdigest()
    angle = int(digest[:8], 16) / 0xFFFFFFFF * 2 * math.pi
    radius = (int(digest[8:16], 16) / 0xFFFFFFFF) * 0.02

    lat = MONTGOMERY_CENTER[0] + radius * math.cos(angle)
    lng = MONTGOMERY_CENTER[1] + radius * math.sin(angle)

    return {
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "address": "Montgomery, AL",
        "neighborhood": "Montgomery",
    }


# ---------------------------------------------------------------------------
# Location extraction (for news articles)
# ---------------------------------------------------------------------------

def extract_location_mentions(title: str, excerpt: str) -> list[str]:
    """Extract specific location mentions (neighborhoods, streets, landmarks)."""
    text = f"{title} {excerpt}"
    text_lower = text.lower()
    mentions: list[str] = []

    for neighborhood in MONTGOMERY_NEIGHBORHOODS:
        if neighborhood.lower() in text_lower:
            mentions.append(neighborhood)

    for landmark in MONTGOMERY_LANDMARKS:
        if landmark.lower() in text_lower:
            mentions.append(landmark)

    for pattern in LOCATION_PATTERNS:
        mentions.extend(re.findall(pattern, text))

    return list(dict.fromkeys(mentions))[:3]


def has_city_level_mention(title: str, excerpt: str) -> bool:
    """Check if article text mentions Montgomery at a city level."""
    text_lower = f"{title} {excerpt}".lower()
    return any(kw in text_lower for kw in CITY_LEVEL_KEYWORDS)
```

**Step 2: Verify imports work**

Run: `cd C:/Users/User/Projects/Pegasus && python -c "from backend.core.data_scraping.geo import geocode_nominatim, MONTGOMERY_CENTER; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
feat(core): add geo module for data_scraping package
```

---

## Task 2: Create BaseScraper and schemas

**Files:**
- Create: `backend/core/data_scraping/base.py`
- Create: `backend/core/data_scraping/schemas.py`

**Step 1: Move schemas**

`backend/core/data_scraping/schemas.py` — copy verbatim from `processors/schemas.py` (47 lines, no changes needed).

**Step 2: Write BaseScraper**

`backend/core/data_scraping/base.py`:

```python
"""BaseScraper — Strategy pattern base class for all data scrapers.

Subclasses implement: fetch(), process(), generate_id().
Base class provides: run(), deduplicate(), load_existing(), save(), broadcast().
"""

import hashlib
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

from backend.core.sse_broadcaster import broadcast_event_threadsafe

logger = logging.getLogger("scraper")


class BaseScraper(ABC):
    """Abstract base for all data scrapers.

    Attributes:
        name: Human-readable scraper name (e.g. "jobs", "news").
        output_file: Path where processed data is saved.
        event_type: SSE event name for frontend broadcast.
        output_format: "geojson" or "json" — controls save/load format.
    """

    name: str
    output_file: Path
    event_type: str
    output_format: str  # "geojson" | "json"

    @abstractmethod
    def fetch(self) -> list[dict]:
        """Fetch raw data from external source. Returns list of raw records."""

    @abstractmethod
    def process(self, raw_data: list[dict]) -> list[dict]:
        """Transform raw records into processed output records."""

    @abstractmethod
    def generate_id(self, record: dict) -> str:
        """Generate a stable dedup ID for a single record."""

    # ------------------------------------------------------------------
    # Template method
    # ------------------------------------------------------------------

    def run(self) -> int:
        """Execute full pipeline: fetch → process → dedup → save → broadcast."""
        logger.info("[%s] Starting scrape", self.name)

        raw_data = self.fetch()
        if not raw_data:
            logger.info("[%s] No data fetched", self.name)
            return 0

        processed = self.process(raw_data)
        if not processed:
            logger.info("[%s] No records after processing", self.name)
            return 0

        existing = self.load_existing()
        merged = self.deduplicate(processed, existing)
        self.save(merged)
        self.broadcast(processed)

        logger.info("[%s] Complete: %d new, %d total", self.name, len(processed), len(merged))
        return len(processed)

    # ------------------------------------------------------------------
    # Shared infrastructure
    # ------------------------------------------------------------------

    @staticmethod
    def make_id(*parts: str) -> str:
        """Generate a stable 12-char hex ID from key parts."""
        key = "__".join(parts)
        return hashlib.md5(key.encode()).hexdigest()[:12]

    def deduplicate(self, new_records: list[dict], existing_records: list[dict]) -> list[dict]:
        """Merge new into existing. New records replace old by ID."""
        new_ids = {self._get_record_id(r) for r in new_records}
        kept = [r for r in existing_records if self._get_record_id(r) not in new_ids]
        return new_records + kept

    def load_existing(self) -> list[dict]:
        """Load existing records from output file."""
        if not self.output_file.exists():
            return []
        try:
            with open(self.output_file, encoding="utf-8") as f:
                data = json.load(f)
            if self.output_format == "geojson":
                return data.get("features", [])
            return data.get(self._collection_key(), [])
        except (json.JSONDecodeError, KeyError):
            return []

    def save(self, records: list[dict]) -> None:
        """Save records to output file in the configured format."""
        self.output_file.parent.mkdir(parents=True, exist_ok=True)

        if self.output_format == "geojson":
            output = {"type": "FeatureCollection", "features": records}
        else:
            output = {
                "lastScraped": datetime.now(timezone.utc).isoformat(),
                f"total{self._collection_key().title()}": len(records),
                self._collection_key(): records,
            }

        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        logger.info("[%s] Saved %d records to %s", self.name, len(records), self.output_file)

    def broadcast(self, records: list[dict]) -> None:
        """Broadcast new records to connected SSE clients."""
        try:
            broadcast_event_threadsafe(self.event_type, records)
        except (RuntimeError, OSError) as exc:
            logger.warning("[%s] SSE broadcast failed: %s", self.name, exc)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_record_id(self, record: dict) -> str:
        """Extract ID from a record, handling both flat and GeoJSON formats."""
        if self.output_format == "geojson":
            return record.get("properties", {}).get("id", "")
        return record.get("id", "")

    def _collection_key(self) -> str:
        """JSON key for the record collection (e.g. 'articles', 'services')."""
        return self.name
```

**Step 3: Verify import**

Run: `python -c "from backend.core.data_scraping.base import BaseScraper; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```
feat(core): add BaseScraper ABC and schemas for data_scraping
```

---

## Task 3: Create JobsScraper

**Files:**
- Create: `backend/core/data_scraping/scrapers/__init__.py`
- Create: `backend/core/data_scraping/scrapers/jobs.py`

**Step 1: Create scrapers package**

`backend/core/data_scraping/scrapers/__init__.py`:
```python
"""Scraper implementations — one file per data source."""

from backend.core.data_scraping.scrapers.jobs import JobsScraper
from backend.core.data_scraping.scrapers.news import NewsScraper
from backend.core.data_scraping.scrapers.housing import HousingScraper
from backend.core.data_scraping.scrapers.benefits import BenefitsScraper
```

NOTE: This file will fail to import until all 4 scrapers exist. Create it now but don't test imports until Task 6. Alternatively, add imports one at a time as scrapers are created.

**Step 2: Write JobsScraper**

`backend/core/data_scraping/scrapers/jobs.py`:

```python
"""Jobs scraper — Indeed, LinkedIn, Glassdoor via Bright Data Web Scraper API."""

import json
import re
import time
from pathlib import Path

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.geo import geocode_nominatim, geocode_arcgis_business
from backend.core.payloads import JOB_SCRAPERS, SKILL_CATEGORIES
from backend.core.bright_data_client import trigger_and_collect


class JobsScraper(BaseScraper):
    name = "jobs"
    output_file = OUTPUT_FILES["jobs"]
    event_type = "jobs"
    output_format = "geojson"

    def fetch(self) -> list[dict]:
        all_jobs: list[dict] = []
        for scraper in JOB_SCRAPERS:
            raw = trigger_and_collect(
                dataset_id=scraper["dataset_id"],
                payload=scraper["payload"],
                params=scraper["params"],
            )
            valid = [r for r in raw if r.get("job_title") and not r.get("error")]
            for job in valid:
                job["_source"] = scraper["name"].lower()
            all_jobs.extend(valid)
        return all_jobs

    def process(self, raw_data: list[dict]) -> list[dict]:
        arcgis_cache: dict[str, tuple | None] = {}
        nominatim_cache: dict[str, tuple | None] = {}
        features: list[dict] = []

        for job in raw_data:
            job["_id"] = self.generate_id(job)
            self._extract_skills(job)
            self._geocode_job(job, arcgis_cache, nominatim_cache)

            feature = self._build_geojson_feature(job)
            if feature:
                features.append(feature)

        return features

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("job_title", ""),
            record.get("company_name", ""),
            record.get("url", ""),
        )

    # ------------------------------------------------------------------
    # Jobs-specific helpers
    # ------------------------------------------------------------------

    def _extract_skills(self, job: dict) -> None:
        desc = job.get("description_text") or job.get("description") or job.get("job_summary") or ""
        desc_clean = re.sub(r"<[^>]+>", " ", desc).lower()
        found: dict[str, list[str]] = {}
        for category, keywords in SKILL_CATEGORIES.items():
            matches = [kw for kw in keywords if kw in desc_clean]
            if matches:
                found[category] = matches
        job["skills"] = found
        all_skills: list[str] = []
        for cat_skills in found.values():
            all_skills.extend(cat_skills)
        job["skill_summary"] = ", ".join(all_skills)

    def _geocode_job(
        self,
        job: dict,
        arcgis_cache: dict[str, tuple | None],
        nominatim_cache: dict[str, tuple | None],
    ) -> None:
        company = job.get("company_name", "")
        address = job.get("location") or job.get("job_location", "")

        if company and company not in arcgis_cache:
            arcgis_cache[company] = geocode_arcgis_business(company)
            time.sleep(0.3)

        arcgis_result = arcgis_cache.get(company)
        if arcgis_result:
            job["lat"], job["lng"] = arcgis_result[0], arcgis_result[1]
            job["geocode_source"] = "arcgis_business_license"
            job["geocode_address"] = arcgis_result[3]
        elif address:
            if address not in nominatim_cache:
                nominatim_cache[address] = geocode_nominatim(address)
                time.sleep(1)
            nom = nominatim_cache.get(address)
            if nom:
                job["lat"], job["lng"] = nom[0], nom[1]
                job["geocode_source"] = "nominatim"

    def _build_geojson_feature(self, job: dict) -> dict | None:
        if "lat" not in job:
            return None
        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [job["lng"], job["lat"]]},
            "properties": {
                "id": job.get("_id", ""),
                "title": job.get("job_title", ""),
                "company": job.get("company_name", ""),
                "source": job.get("_source", ""),
                "address": job.get("location") or job.get("job_location", ""),
                "geocode_source": job.get("geocode_source", ""),
                "geocode_address": job.get("geocode_address", ""),
                "job_type": job.get("job_type") or job.get("job_employment_type", ""),
                "salary": job.get("salary_formatted") or job.get("job_base_pay_range", ""),
                "seniority": job.get("job_seniority_level", ""),
                "industry": job.get("job_industries") or job.get("job_function", ""),
                "applicants": job.get("job_num_applicants"),
                "posted": job.get("date_posted_parsed") or job.get("job_posted_date", ""),
                "url": job.get("url", ""),
                "apply_link": job.get("apply_link", ""),
                "skills": job.get("skills", {}),
                "skill_summary": job.get("skill_summary", ""),
                "benefits": job.get("benefits", []),
                "company_rating": job.get("company_rating"),
                "scraped_at": job.get("_scraped_at", ""),
            },
        }

    def save(self, records: list[dict]) -> None:
        """Override to also append to history JSONL."""
        super().save(records)
        history_file = OUTPUT_FILES["jobs_history"]
        history_file.parent.mkdir(parents=True, exist_ok=True)
        # Only append the new records (those from the latest fetch)
        with open(history_file, "a", encoding="utf-8") as f:
            for feat in records:
                f.write(json.dumps(feat) + "\n")
```

NOTE about `detect_source`: The old function is no longer needed — each scraper config in `JOB_SCRAPERS` already has a `name` field that we use directly as `_source`.

**Step 3: Verify import**

Run: `python -c "from backend.core.data_scraping.scrapers.jobs import JobsScraper; print(JobsScraper.name)"`
Expected: `jobs`

**Step 4: Commit**

```
feat(core): add JobsScraper with strategy pattern
```

---

## Task 4: Create NewsScraper

**Files:**
- Create: `backend/core/data_scraping/scrapers/news.py`

**Step 1: Write NewsScraper**

`backend/core/data_scraping/scrapers/news.py`:

```python
"""News scraper — SERP discovery + sentiment enrichment + 3-tier geocoding."""

import logging
import time
from datetime import datetime, timezone
from pathlib import Path

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.geo import (
    geocode_serp_maps,
    build_jittered_city_center,
    extract_location_mentions,
    has_city_level_mention,
)
from backend.core.bright_data_client import serp_search, fetch_with_unlocker
from backend.core.payloads import NEWS_QUERIES
from backend.core.sentiment_rules import score_sentiment, score_misinfo_risk, build_summary

logger = logging.getLogger("scraper.news")


class NewsScraper(BaseScraper):
    name = "articles"  # JSON collection key
    output_file = OUTPUT_FILES["news"]
    event_type = "news"
    output_format = "json"

    def fetch(self) -> list[dict]:
        articles = self._discover_articles()
        if articles:
            articles = self._fetch_full_text(articles, max_articles=10)
        return articles

    def process(self, raw_data: list[dict]) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        processed: list[dict] = []

        for item in raw_data:
            title = item.get("title", "")
            url = item.get("sourceUrl") or item.get("link") or item.get("url") or ""
            if not title or not url:
                continue

            article = self._build_article(item, now)
            self._enrich_sentiment(article)
            processed.append(article)

        self._geocode_articles(processed)
        return processed

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("title", ""),
            record.get("sourceUrl", "") or record.get("link", "") or record.get("url", ""),
        )

    def _collection_key(self) -> str:
        return "articles"

    def save(self, records: list[dict]) -> None:
        """Override for news-specific JSON structure."""
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        output = {
            "lastScraped": datetime.now(timezone.utc).isoformat(),
            "totalArticles": len(records),
            "articles": records,
        }
        import json
        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        logger.info("[%s] Saved %d articles to %s", self.name, len(records), self.output_file)

    def run(self) -> int:
        """Override to chain comment analysis after news scrape."""
        count = super().run()
        if count > 0:
            self._run_comment_analysis()
        return count

    # ------------------------------------------------------------------
    # News-specific helpers
    # ------------------------------------------------------------------

    def _discover_articles(self) -> list[dict]:
        all_articles: list[dict] = []
        for i, entry in enumerate(NEWS_QUERIES):
            body = serp_search(entry["query"])
            if body:
                articles = self._parse_serp_results(body, entry["category"])
                all_articles.extend(articles)
            if i < len(NEWS_QUERIES) - 1:
                time.sleep(2)
        return all_articles

    def _parse_serp_results(self, body: dict, category: str) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        news_items = body.get("news") or body.get("organic") or body.get("results") or []
        articles: list[dict] = []

        for item in news_items:
            title = item.get("title", "")
            url = item.get("link") or item.get("url") or ""
            if not title or not url:
                continue
            articles.append({
                "id": self.make_id(title, url),
                "title": title,
                "excerpt": item.get("snippet") or item.get("description") or "",
                "body": "",
                "source": item.get("source", ""),
                "sourceUrl": url,
                "imageUrl": item.get("thumbnail") or item.get("image") or None,
                "category": category,
                "publishedAt": item.get("date") or item.get("age") or "",
                "scrapedAt": now,
                "upvotes": 0,
                "downvotes": 0,
                "commentCount": 0,
            })
        return articles

    def _build_article(self, item: dict, now: str) -> dict:
        """Build article dict from an already-parsed item."""
        if "id" in item:
            return item
        title = item.get("title", "")
        url = item.get("sourceUrl") or item.get("link") or item.get("url") or ""
        return {
            "id": self.make_id(title, url),
            "title": title,
            "excerpt": item.get("excerpt") or item.get("snippet") or "",
            "body": item.get("body", ""),
            "source": item.get("source", ""),
            "sourceUrl": url,
            "imageUrl": item.get("imageUrl") or item.get("thumbnail") or None,
            "category": item.get("category", "general"),
            "publishedAt": item.get("publishedAt") or item.get("date") or "",
            "scrapedAt": now,
            "upvotes": item.get("upvotes", 0),
            "downvotes": item.get("downvotes", 0),
            "commentCount": item.get("commentCount", 0),
        }

    def _fetch_full_text(self, articles: list[dict], max_articles: int = 20) -> list[dict]:
        need_text = [a for a in articles if not a.get("body")][:max_articles]
        for article in need_text:
            url = article.get("sourceUrl", "")
            if not url:
                continue
            content = fetch_with_unlocker(url, as_markdown=True)
            if content:
                article["body"] = content[:2000]
            time.sleep(1)
        return articles

    def _enrich_sentiment(self, article: dict) -> None:
        title = article.get("title", "")
        excerpt = article.get("excerpt", "")
        sentiment, sentiment_score = score_sentiment(title, excerpt)
        article["sentiment"] = sentiment
        article["sentimentScore"] = sentiment_score
        article["misinfoRisk"] = score_misinfo_risk(title)
        article["summary"] = build_summary(title)

    def _geocode_articles(self, articles: list[dict], max_geocode: int = 500) -> None:
        api_calls = 0
        for article in articles:
            if isinstance(article.get("location"), dict) and article["location"].get("lat") is not None:
                continue

            title = article.get("title", "")
            excerpt = article.get("excerpt", "")
            specific_mentions = extract_location_mentions(title, excerpt)

            if specific_mentions and api_calls < max_geocode:
                location = None
                for mention in specific_mentions:
                    api_calls += 1
                    location = geocode_serp_maps(mention)
                    if location:
                        break
                    time.sleep(1)
                if location:
                    article["location"] = location
                    continue

            article["location"] = build_jittered_city_center(article.get("id", title))

    def _run_comment_analysis(self) -> None:
        """Chain AI comment analysis after news scrape."""
        try:
            from backend.agents.comment_analysis import run_comment_analysis_pipeline
            run_comment_analysis_pipeline()
        except Exception:
            logger.exception("[%s] Comment analysis failed", self.name)
```

**Step 2: Verify import**

Run: `python -c "from backend.core.data_scraping.scrapers.news import NewsScraper; print(NewsScraper.event_type)"`
Expected: `news`

**Step 3: Commit**

```
feat(core): add NewsScraper with SERP discovery and geocoding
```

---

## Task 5: Create HousingScraper and BenefitsScraper

**Files:**
- Create: `backend/core/data_scraping/scrapers/housing.py`
- Create: `backend/core/data_scraping/scrapers/benefits.py`

**Step 1: Write HousingScraper**

`backend/core/data_scraping/scrapers/housing.py`:

```python
"""Housing scraper — Zillow rentals via Bright Data Web Scraper API."""

import time
from datetime import datetime, timezone
from pathlib import Path

from backend.config import DATASETS, OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.geo import geocode_nominatim
from backend.core.bright_data_client import trigger_and_collect


class HousingScraper(BaseScraper):
    name = "housing"
    output_file = OUTPUT_FILES["housing"]
    event_type = "housing"
    output_format = "geojson"

    def fetch(self) -> list[dict]:
        payload = [{"url": "https://www.zillow.com/montgomery-al/rentals/"}]
        params = {"type": "discover_new", "discover_by": "url", "limit_per_input": "100"}
        return trigger_and_collect(
            dataset_id=DATASETS["zillow"],
            payload=payload,
            params=params,
        )

    def process(self, raw_data: list[dict]) -> list[dict]:
        geocode_cache: dict[str, tuple[float, float] | None] = {}
        features: list[dict] = []

        for listing in raw_data:
            if listing.get("error"):
                continue
            feature = self._build_feature(listing, geocode_cache)
            if feature:
                features.append(feature)
        return features

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("address", ""),
            str(record.get("price", "")),
        )

    def _build_feature(self, listing: dict, geocode_cache: dict) -> dict | None:
        address = listing.get("address") or listing.get("streetAddress") or ""
        city = listing.get("city") or "Montgomery"
        state = listing.get("state") or "AL"
        full_address = f"{address}, {city}, {state}" if address else ""

        lat = listing.get("latitude")
        lng = listing.get("longitude")

        if not lat or not lng:
            if full_address and full_address not in geocode_cache:
                geocode_cache[full_address] = geocode_nominatim(full_address)
                time.sleep(1)
            coords = geocode_cache.get(full_address)
            if coords:
                lat, lng = coords

        if not lat or not lng:
            return None

        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "id": self.generate_id(listing),
                "address": full_address,
                "price": listing.get("price") or listing.get("unformattedPrice"),
                "price_formatted": self._format_price(listing.get("price")),
                "beds": listing.get("bedrooms") or listing.get("beds"),
                "baths": listing.get("bathrooms") or listing.get("baths"),
                "sqft": listing.get("livingArea") or listing.get("area"),
                "listing_type": listing.get("homeType") or listing.get("listingType", ""),
                "status": listing.get("homeStatus") or listing.get("listingStatus", ""),
                "url": listing.get("url") or listing.get("detailUrl", ""),
                "image_url": listing.get("imgSrc") or listing.get("image", ""),
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    @staticmethod
    def _format_price(price) -> str:
        if not price:
            return ""
        try:
            num = int(str(price).replace(",", "").replace("$", ""))
            return f"${num:,}"
        except (ValueError, TypeError):
            return str(price)
```

**Step 2: Write BenefitsScraper**

`backend/core/data_scraping/scrapers/benefits.py`:

```python
"""Benefits scraper — Government eligibility pages via Bright Data Web Unlocker."""

import re
import time
from datetime import datetime, timezone
from pathlib import Path

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.bright_data_client import fetch_with_unlocker
from backend.core.payloads import BENEFITS_TARGETS


class BenefitsScraper(BaseScraper):
    name = "services"  # JSON collection key
    output_file = OUTPUT_FILES["benefits"]
    event_type = "benefits"
    output_format = "json"

    def fetch(self) -> list[dict]:
        """Fetch benefit pages as markdown via Web Unlocker."""
        results: list[dict] = []
        for i, target in enumerate(BENEFITS_TARGETS):
            markdown = fetch_with_unlocker(url=target["url"], as_markdown=True)
            if markdown:
                results.append({"markdown": markdown, "target": target})
            if i < len(BENEFITS_TARGETS) - 1:
                time.sleep(2)
        return results

    def process(self, raw_data: list[dict]) -> list[dict]:
        return [self._parse_benefit_markdown(item["markdown"], item["target"]) for item in raw_data]

    def generate_id(self, record: dict) -> str:
        return record.get("id", "")

    def _collection_key(self) -> str:
        return "services"

    def save(self, records: list[dict]) -> None:
        """Override for benefits-specific JSON structure."""
        import json
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        output = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_services": len(records),
            "categories": list({s["category"] for s in records}),
            "services": records,
        }
        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

    def run(self) -> int:
        """Override to merge with fallback data."""
        raw_data = self.fetch()
        live_services = self.process(raw_data) if raw_data else []
        fallback = self.load_existing()
        merged = self._merge_with_fallback(live_services, fallback)
        self.save(merged)
        return len(merged)

    # ------------------------------------------------------------------
    # Benefits-specific parsing
    # ------------------------------------------------------------------

    def _parse_benefit_markdown(self, markdown: str, target: dict) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        income_limits = self._parse_income_table(markdown)
        eligibility = self._parse_requirements_list(markdown, "eligib")
        how_to_apply = self._parse_requirements_list(markdown, "apply")
        documents = self._parse_requirements_list(markdown, "document")

        if not eligibility:
            eligibility = self._parse_requirements_list(markdown, "qualif")
        if not how_to_apply:
            how_to_apply = self._parse_requirements_list(markdown, "how to")

        return {
            "id": target["id"],
            "category": target["category"],
            "title": target["name"],
            "provider": self._extract_provider(markdown) or target["name"],
            "description": self._extract_first_paragraph(markdown),
            "eligibility": eligibility,
            "income_limits": income_limits,
            "how_to_apply": how_to_apply,
            "documents_needed": documents,
            "url": target["url"],
            "phone": self._extract_phone(markdown),
            "scraped_at": now,
            "source": "live_scrape",
        }

    @staticmethod
    def _parse_income_table(markdown: str) -> dict[str, int]:
        limits: dict[str, int] = {}
        pattern = r"\|?\s*(?:Household\s+(?:of\s+)?)?(\d+)\s*\|?\s*\$?([\d,]+)"
        for match in re.finditer(pattern, markdown):
            limits[match.group(1)] = int(match.group(2).replace(",", ""))
        return limits

    @staticmethod
    def _parse_requirements_list(markdown: str, section_keyword: str) -> list[str]:
        lines = markdown.split("\n")
        collecting = False
        items: list[str] = []
        for line in lines:
            stripped = line.strip()
            if section_keyword.lower() in stripped.lower() and stripped.startswith("#"):
                collecting = True
                continue
            if collecting and stripped.startswith("#"):
                break
            if collecting and (stripped.startswith("- ") or stripped.startswith("* ")):
                text = stripped.lstrip("-* ").strip()
                if len(text) > 5:
                    items.append(text)
        return items[:15]

    @staticmethod
    def _extract_first_paragraph(markdown: str) -> str:
        for line in markdown.split("\n"):
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and not stripped.startswith("|") and len(stripped) > 30:
                return stripped[:300]
        return ""

    @staticmethod
    def _extract_phone(markdown: str) -> str:
        match = re.search(r"[\(]?\d{3}[\)\-\s]?\s*\d{3}[\-\s]\d{4}", markdown)
        return match.group(0) if match else ""

    @staticmethod
    def _extract_provider(markdown: str) -> str:
        for line in markdown.split("\n"):
            if line.strip().startswith("# "):
                return line.strip().lstrip("# ").strip()[:100]
        return ""

    @staticmethod
    def _merge_with_fallback(live: list[dict], fallback: list[dict]) -> list[dict]:
        live_ids = {s["id"] for s in live}
        kept = [s for s in fallback if s["id"] not in live_ids]
        return live + kept
```

**Step 3: Verify imports**

Run: `python -c "from backend.core.data_scraping.scrapers.housing import HousingScraper; from backend.core.data_scraping.scrapers.benefits import BenefitsScraper; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```
feat(core): add HousingScraper and BenefitsScraper
```

---

## Task 6: Move comment analysis to agents + create scheduler

**Files:**
- Create: `backend/agents/comment_analysis.py` (moved + refactored from `processors/analyze_comments.py`)
- Create: `backend/core/data_scraping/scheduler.py`

**Step 1: Create comment_analysis.py in agents**

`backend/agents/comment_analysis.py`:

```python
"""Batch comment analysis using LangChain + Gemini structured output.

Post-processing step chained after the news scraper. Analyzes citizen
comments on articles and merges sentiment results back into the news feed.
"""

import asyncio
import json
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from backend.config import OUTPUT_FILES, REPO_ROOT
from backend.core.data_scraping.schemas import ArticleAnalysis, AnalysisResults
from backend.agents.prompts import BATCH_ANALYSIS_PROMPT

logger = logging.getLogger("agents.comment_analysis")

ANALYSIS_OUTPUT = REPO_ROOT / "backend" / "data" / "analysis_results.json"
METRICS_OUTPUT = REPO_ROOT / "backend" / "data" / "analysis_metrics.jsonl"
MODEL_NAME = "gemini-3.1-flash-lite-preview"
PROMPT_VERSION = "v1.0"
MAX_CONCURRENCY = 10

# ---------------------------------------------------------------------------
# PII redaction
# ---------------------------------------------------------------------------

_PHONE_PATTERN = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
_EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_ADDRESS_PATTERN = re.compile(
    r"\b\d+\s+\w+(?:\s+\w+)?\s+(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Cir|Loop|Pkwy)\b",
    re.IGNORECASE,
)


def redact_comment_text(text: str) -> str:
    """Remove PII patterns from a comment string."""
    result = _PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
    result = _EMAIL_PATTERN.sub("[REDACTED_EMAIL]", result)
    result = _ADDRESS_PATTERN.sub("[REDACTED_ADDRESS]", result)
    return result


# ---------------------------------------------------------------------------
# LLM chain
# ---------------------------------------------------------------------------

def _build_analysis_chain() -> Runnable:
    llm = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0, max_output_tokens=8192)
    prompt = ChatPromptTemplate.from_messages([
        ("system", BATCH_ANALYSIS_PROMPT),
        ("human", (
            "Article: {article_title}\n"
            "Excerpt: {article_excerpt}\n\n"
            "Comments ({comment_count} total):\n{comments_text}"
        )),
    ])
    return prompt | llm.with_structured_output(ArticleAnalysis)


def _format_comments_for_prompt(comments: list[dict]) -> str:
    lines = []
    for i, c in enumerate(comments, 1):
        redacted = redact_comment_text(c.get("content", ""))
        lines.append(f"{i}. [ID: {c['id']}] {redacted}")
    return "\n".join(lines) if lines else "(no comments)"


async def _analyze_single_article(
    chain: Runnable, article: dict, comments: list[dict], semaphore: asyncio.Semaphore,
) -> tuple[ArticleAnalysis | None, int, float]:
    async with semaphore:
        comments_text = _format_comments_for_prompt(comments)
        start = time.time()
        try:
            result: ArticleAnalysis = await chain.ainvoke({
                "article_title": article["title"],
                "article_excerpt": article.get("excerpt", ""),
                "comment_count": str(len(comments)),
                "comments_text": comments_text,
            })
            result.article_id = article["id"]
            return result, len(comments), time.time() - start
        except Exception as exc:
            logger.warning("Failed to analyze %s: %s", article["id"], exc)
            return None, len(comments), time.time() - start


async def run_batch_analysis(articles: list[dict], comments: list[dict]) -> AnalysisResults:
    """Run parallel analysis on articles that have comments."""
    chain = _build_analysis_chain()
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    tasks = []
    for article in articles:
        article_comments = [c for c in comments if c.get("articleId") == article["id"]]
        if article_comments:
            tasks.append(_analyze_single_article(chain, article, article_comments, semaphore))

    if not tasks:
        return AnalysisResults(
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            model_version=MODEL_NAME, prompt_version=PROMPT_VERSION,
            total_articles=0, total_comments=0, articles=[],
        )

    outcomes = await asyncio.gather(*tasks)
    results: list[ArticleAnalysis] = []
    total_comments = 0
    for result, comment_count, elapsed in outcomes:
        if result:
            results.append(result)
            total_comments += comment_count
            _log_metrics(result.article_id, comment_count, elapsed)

    return AnalysisResults(
        analyzed_at=datetime.now(timezone.utc).isoformat(),
        model_version=MODEL_NAME, prompt_version=PROMPT_VERSION,
        total_articles=len(results), total_comments=total_comments,
        articles=results,
    )


def save_analysis_results(results: AnalysisResults) -> Path:
    ANALYSIS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    ANALYSIS_OUTPUT.write_text(results.model_dump_json(indent=2), encoding="utf-8")
    return ANALYSIS_OUTPUT


def _log_metrics(article_id: str, comment_count: int, latency: float) -> None:
    entry = {
        "article_id": article_id,
        "comment_count": comment_count,
        "latency_ms": round(latency * 1000),
        "model_version": MODEL_NAME,
        "prompt_version": PROMPT_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    with open(METRICS_OUTPUT, "a") as f:
        f.write(json.dumps(entry) + "\n")


# ---------------------------------------------------------------------------
# Pipeline entrypoint (called by NewsScraper and analysis router)
# ---------------------------------------------------------------------------

def merge_community_sentiment(results: AnalysisResults) -> None:
    """Inject AI community-sentiment fields back into news_feed.json."""
    news_path = OUTPUT_FILES["news"]
    if not news_path.exists():
        return
    data = json.loads(news_path.read_text(encoding="utf-8"))
    articles = data.get("articles", [])
    analysis_map = {a.article_id: a for a in results.articles}

    changed = False
    for article in articles:
        analysis = analysis_map.get(article["id"])
        if not analysis:
            continue
        article["communitySentiment"] = analysis.article_sentiment
        article["communityConfidence"] = analysis.article_confidence
        article["sentimentBreakdown"] = analysis.sentiment_breakdown
        article["communitySummary"] = analysis.admin_summary
        article["urgentConcerns"] = analysis.urgent_concerns
        changed = True

    if changed:
        data["articles"] = articles
        with open(news_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def run_comment_analysis_pipeline() -> None:
    """Full pipeline: load comments + articles → analyze → merge back."""
    from backend.api.routers.comments import COMMENTS_PATH

    if not COMMENTS_PATH.exists():
        return
    try:
        comments = json.loads(COMMENTS_PATH.read_text(encoding="utf-8")).get("comments", [])
    except (json.JSONDecodeError, KeyError):
        return

    if not comments:
        return

    news_path = OUTPUT_FILES["news"]
    if not news_path.exists():
        return
    articles = json.loads(news_path.read_text(encoding="utf-8")).get("articles", [])

    commented_ids = {c["articleId"] for c in comments}
    articles_with_comments = [a for a in articles if a["id"] in commented_ids]
    if not articles_with_comments:
        return

    logger.info("Analyzing %d articles with %d comments", len(articles_with_comments), len(comments))
    results = asyncio.run(run_batch_analysis(articles_with_comments, comments))
    save_analysis_results(results)
    merge_community_sentiment(results)
    logger.info("Comment analysis complete — %d articles analyzed", results.total_articles)
```

**Step 2: Create scheduler**

`backend/core/data_scraping/scheduler.py`:

```python
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
```

**Step 3: Verify imports**

Run: `python -c "from backend.core.data_scraping.scheduler import start_scheduled_scraping; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```
feat(core): add scheduler and move comment analysis to agents
```

---

## Task 7: Update API routers and main.py

**Files:**
- Modify: `backend/api/routers/webhooks.py`
- Modify: `backend/api/routers/analysis.py`
- Modify: `backend/api/main.py` (update scheduler import)

**Step 1: Update webhooks.py imports**

Replace all processor imports with scraper class imports. The webhook endpoints should instantiate the scrapers and call their processing methods. Key changes:

In `webhooks.py`, replace:
```python
from backend.processors.process_jobs import (
    detect_source, process_jobs, build_geojson_feature, save_job_results,
)
from backend.processors.process_news import (
    parse_news_results, enrich_article, deduplicate_articles,
    load_existing_articles, save_news_articles,
)
from backend.processors.process_housing import (
    process_zillow_listings, save_housing_results,
)
```

With:
```python
from backend.core.data_scraping.scrapers.jobs import JobsScraper
from backend.core.data_scraping.scrapers.news import NewsScraper
from backend.core.data_scraping.scrapers.housing import HousingScraper
```

Update `webhook_jobs`:
```python
@router.post("/jobs")
async def webhook_jobs(request: Request, _: None = Depends(verify_webhook_secret)) -> JSONResponse:
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
```

Update `webhook_news`:
```python
@router.post("/news")
async def webhook_news(request: Request, _: None = Depends(verify_webhook_secret)) -> JSONResponse:
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
```

Update `webhook_housing`:
```python
@router.post("/housing")
async def webhook_housing(request: Request, _: None = Depends(verify_webhook_secret)) -> JSONResponse:
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
```

**Step 2: Update analysis.py imports**

Replace:
```python
from backend.processors.analyze_comments import run_batch_analysis, save_analysis_results
from backend.processors.process_news import merge_community_sentiment_into_news_feed
```
With:
```python
from backend.agents.comment_analysis import run_batch_analysis, save_analysis_results, merge_community_sentiment
```

And update the `_run_analysis` function to call `merge_community_sentiment(results)` instead of `merge_community_sentiment_into_news_feed(results)`.

**Step 3: Update main.py scheduler import**

Find the import of `start_scheduled_scraping` from `backend.core.scrape_scheduler` and replace with:
```python
from backend.core.data_scraping.scheduler import start_scheduled_scraping
```

**Step 4: Verify the server starts**

Run: `cd C:/Users/User/Projects/Pegasus && python -c "from backend.api.routers.webhooks import router; print('webhooks OK')"`
Run: `cd C:/Users/User/Projects/Pegasus && python -c "from backend.api.routers.analysis import router; print('analysis OK')"`

**Step 5: Commit**

```
refactor(api): update routers to use new data_scraping package
```

---

## Task 8: Update tests

**Files:**
- Rename + Modify: `backend/tests/test_processors.py` → `backend/tests/test_scrapers.py`

**Step 1: Update all imports in test file**

Replace:
```python
from backend.processors.process_news import (
    generate_article_id, parse_news_results, deduplicate_articles, enrich_article,
)
from backend.processors.process_jobs import detect_source, generate_job_id, extract_skills
from backend.processors.scrape_orchestrators import build_geojson_feature
from backend.processors.process_housing import generate_listing_id, format_price
```

With:
```python
from backend.core.data_scraping.scrapers.jobs import JobsScraper
from backend.core.data_scraping.scrapers.news import NewsScraper
from backend.core.data_scraping.scrapers.housing import HousingScraper
from backend.core.data_scraping.base import BaseScraper
```

Update test functions to use the new scraper methods. Key mappings:
- `generate_article_id(title, url)` → `BaseScraper.make_id(title, url)`
- `parse_news_results(body, cat)` → `NewsScraper()._parse_serp_results(body, cat)`
- `deduplicate_articles(articles)` → `NewsScraper().deduplicate(articles, [])` (or test base class directly)
- `enrich_article(article)` → `NewsScraper()._enrich_sentiment(article)`
- `detect_source([record])` → removed (no longer needed, source comes from config)
- `generate_job_id(job)` → `JobsScraper().generate_id(job)`
- `extract_skills(desc)` → `JobsScraper()._extract_skills(job)` (mutates job in place now)
- `build_geojson_feature(job)` → `JobsScraper()._build_geojson_feature(job)`
- `generate_listing_id(listing)` → `HousingScraper().generate_id(listing)`
- `format_price(price)` → `HousingScraper._format_price(price)`

NOTE: `detect_source` tests can be removed — source detection is no longer needed since each JOB_SCRAPERS entry has an explicit `name`.

**Step 2: Run tests**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/test_scrapers.py -v`
Expected: All tests pass

**Step 3: Commit**

```
test: update tests for new data_scraping package
```

---

## Task 9: Delete old files

**Step 1: Delete old directories and files**

```bash
rm -rf backend/processors/
rm -rf backend/triggers/
rm backend/core/scrape_scheduler.py
```

**Step 2: Verify no remaining imports to old paths**

Run: `grep -r "from backend.processors\|from backend.triggers\|from backend.core.scrape_scheduler" backend/ --include="*.py"`
Expected: No matches

**Step 3: Run full test suite**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/ -v`
Expected: All tests pass

**Step 4: Verify server starts**

Run: `cd C:/Users/User/Projects/Pegasus && python -c "from backend.api.main import app; print('Server OK')"`

**Step 5: Commit**

```
refactor: remove old processors/ and triggers/ directories
```

---

## Task 10: Update scrapers/__init__.py and data_scraping/__init__.py for clean public API

**Files:**
- Modify: `backend/core/data_scraping/__init__.py`
- Verify: `backend/core/data_scraping/scrapers/__init__.py`

**Step 1: Update data_scraping __init__**

```python
"""Data scraping package — Strategy pattern scrapers with shared base class.

Usage:
    from backend.core.data_scraping import BaseScraper
    from backend.core.data_scraping.scrapers import JobsScraper, NewsScraper
    from backend.core.data_scraping.scheduler import start_scheduled_scraping
"""

from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.scheduler import start_scheduled_scraping
```

**Step 2: Final verification**

Run: `python -c "from backend.core.data_scraping import BaseScraper, start_scheduled_scraping; print('Public API OK')"`
Run: `python -c "from backend.core.data_scraping.scrapers import JobsScraper, NewsScraper, HousingScraper, BenefitsScraper; print('All scrapers OK')"`
Run: `python -m pytest backend/tests/ -v`

**Step 3: Commit**

```
chore: finalize data_scraping public API
```

---

Plan complete and saved to `docs/plans/2026-03-10-data-scraping-consolidation.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?
