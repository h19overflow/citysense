# Bright Data Live Streams — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded static data with 4 live Bright Data streams (jobs, news, benefits, housing) using a unified config, shared client, individual triggers, and a FastAPI webhook server.

**Architecture:** Shared `config.py` + `bright_data_client.py` → 4 trigger scripts (each targeting a Bright Data product) → 4 processor modules (transform raw data to frontend JSON/GeoJSON) → 1 FastAPI webhook server that routes all deliveries. Every trigger supports `--poll` fallback.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, requests, BeautifulSoup4, existing ArcGIS/Nominatim geocoding

**Design doc:** `docs/plans/2026-03-06-brightdata-live-streams-design.md`

---

## Task 1: Shared Config Module

**Files:**
- Create: `scripts/config.py`

**Step 1: Create `scripts/config.py`**

```python
"""Centralized config for all Bright Data scripts.

All credentials from environment variables. No hardcoded fallbacks.
Dataset IDs, search queries, file paths, and skill categories live here.
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

API_KEY = require_env("BRIGHTDATA_API_KEY")
SERP_ZONE = os.environ.get("BRIGHTDATA_SERP_ZONE", "serp_api1")
UNLOCKER_ZONE = os.environ.get("BRIGHTDATA_UNLOCKER_ZONE", "web_unlocker1")

# ---------------------------------------------------------------------------
# Bright Data endpoints
# ---------------------------------------------------------------------------

BD_API_BASE = "https://api.brightdata.com/datasets/v3"
BD_REQUEST_URL = "https://api.brightdata.com/request"

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
PUBLIC_DATA = REPO_ROOT / "montgomery-navigator" / "public" / "data"
SCRIPTS_DATA = Path(__file__).resolve().parent / "data"
RAW_DIR = SCRIPTS_DATA / "raw"

OUTPUT_FILES = {
    "jobs": PUBLIC_DATA / "jobs_latest.geojson",
    "jobs_history": SCRIPTS_DATA / "jobs_history.jsonl",
    "news": PUBLIC_DATA / "news_feed.json",
    "benefits": PUBLIC_DATA / "gov_services.json",
    "housing": PUBLIC_DATA / "housing.geojson",
}

# ---------------------------------------------------------------------------
# Job scraper payloads
# ---------------------------------------------------------------------------

JOB_SCRAPERS = [
    {
        "name": "Indeed",
        "dataset_id": DATASETS["indeed"],
        "payload": [{
            "country": "US",
            "domain": "indeed.com",
            "keyword_search": "jobs",
            "location": "Montgomery, AL",
        }],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "500",
        },
    },
    {
        "name": "LinkedIn",
        "dataset_id": DATASETS["linkedin"],
        "payload": [{
            "keyword": "jobs",
            "location": "Montgomery, Alabama, United States",
            "country": "US",
        }],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "500",
        },
    },
    {
        "name": "Glassdoor",
        "dataset_id": DATASETS["glassdoor_jobs"],
        "payload": [{
            "keyword": "jobs",
            "location": "Montgomery, Alabama",
        }],
        "params": {
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": "500",
        },
    },
]

# ---------------------------------------------------------------------------
# News queries (SERP API)
# ---------------------------------------------------------------------------

NEWS_QUERIES = [
    {"query": "Montgomery Alabama news today", "category": "general"},
    {"query": "Montgomery Alabama latest news", "category": "general"},
    {"query": "Montgomery AL breaking news", "category": "general"},
    {"query": "Montgomery Alabama development projects", "category": "development"},
    {"query": "Montgomery Alabama housing construction", "category": "development"},
    {"query": "Montgomery Alabama new business opening", "category": "development"},
    {"query": "Montgomery Alabama infrastructure investment", "category": "development"},
    {"query": "Montgomery Alabama real estate development", "category": "development"},
    {"query": "Montgomery Alabama city council government", "category": "government"},
    {"query": "Montgomery Alabama mayor city hall", "category": "government"},
    {"query": "Montgomery Alabama public policy budget", "category": "government"},
    {"query": "Montgomery Alabama zoning permits", "category": "government"},
    {"query": "Montgomery Alabama community events", "category": "events"},
    {"query": "Montgomery Alabama festivals concerts", "category": "events"},
    {"query": "Montgomery Alabama volunteer nonprofit", "category": "community"},
    {"query": "Montgomery Alabama crime safety police", "category": "community"},
    {"query": "Montgomery Alabama schools education", "category": "community"},
    {"query": "Montgomery Alabama parks recreation", "category": "community"},
    {"query": "Montgomery Alabama jobs hiring employers", "category": "general"},
    {"query": "Montgomery Alabama economy employment", "category": "general"},
    {"query": "Montgomery Alabama small business", "category": "development"},
    {"query": "Montgomery Alabama health hospital clinic", "category": "community"},
]

# ---------------------------------------------------------------------------
# Benefits scrape targets (Web Unlocker)
# ---------------------------------------------------------------------------

BENEFITS_TARGETS = [
    {
        "id": "svc-medicaid-al",
        "name": "Alabama Medicaid",
        "url": "https://medicaid.alabama.gov",
        "category": "healthcare",
    },
    {
        "id": "svc-snap-al",
        "name": "SNAP (Food Stamps)",
        "url": "https://dhr.alabama.gov/food-assistance/",
        "category": "food",
    },
    {
        "id": "svc-tanf-al",
        "name": "TANF",
        "url": "https://dhr.alabama.gov/temporary-assistance/",
        "category": "benefits",
    },
]

# ---------------------------------------------------------------------------
# Skill categories (job matching)
# ---------------------------------------------------------------------------

SKILL_CATEGORIES = {
    "education": [
        "high school", "ged", "bachelor", "associate", "master", "diploma",
        "degree", "college", "university", "certification", "licensed",
    ],
    "technical": [
        "cdl", "forklift", "hvac", "welding", "electrical", "plumbing",
        "mechanical", "cnc", "autocad", "microsoft office", "excel",
        "computer", "software", "programming", "python", "sql", "data entry",
    ],
    "healthcare": [
        "cna", "rn", "lpn", "nursing", "cpr", "first aid", "patient care",
        "medical", "phlebotomy", "emt", "pharmacy", "clinical",
    ],
    "soft_skills": [
        "communication", "teamwork", "leadership", "customer service",
        "problem solving", "time management", "detail oriented",
        "organizational", "multitask",
    ],
    "experience": [
        "1 year", "2 year", "3 year", "5 year", "experience required",
        "entry level", "no experience", "years of experience",
    ],
    "physical": [
        "lifting", "standing", "physical", "warehouse", "manual labor",
        "outdoors", "driving", "travel",
    ],
    "clearance": [
        "background check", "drug test", "drug screen", "security clearance",
        "fingerprint",
    ],
}
```

**Step 2: Verify it loads**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.config import API_KEY, DATASETS; print('OK', len(DATASETS), 'datasets')"`
Expected: `OK 6 datasets`

**Step 3: Commit**

```
git add scripts/config.py
git commit -m "feat(scripts): add centralized config module for Bright Data credentials and data"
```

---

## Task 2: Shared Bright Data Client

**Files:**
- Create: `scripts/bright_data_client.py`

**Step 1: Create `scripts/bright_data_client.py`**

```python
"""Shared Bright Data API client.

Provides trigger, poll, download, Web Unlocker, and SERP functions
used by all trigger scripts. Handles retries and error logging.
"""

import json
import time
import requests
from scripts.config import API_KEY, BD_API_BASE, BD_REQUEST_URL


def _auth_headers() -> dict[str, str]:
    """Return standard auth headers."""
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }


def trigger_scraper(
    dataset_id: str,
    payload: list[dict],
    params: dict | None = None,
    webhook_url: str | None = None,
) -> str | None:
    """Trigger a Web Scraper API dataset. Returns snapshot_id or None."""
    query_params = {
        "dataset_id": dataset_id,
        "format": "json",
        "include_errors": "true",
    }
    if params:
        query_params.update(params)
    if webhook_url:
        query_params["notify"] = webhook_url

    try:
        resp = requests.post(
            f"{BD_API_BASE}/trigger",
            headers=_auth_headers(),
            params=query_params,
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        snapshot_id = resp.json()["snapshot_id"]
        print(f"  Triggered: {snapshot_id}")
        return snapshot_id
    except requests.RequestException as e:
        print(f"  Trigger failed: {e}")
        return None


def poll_snapshot(
    snapshot_id: str,
    max_wait: int = 600,
    interval: int = 15,
) -> list[dict]:
    """Poll until snapshot is ready, then download results."""
    elapsed = 0
    while elapsed < max_wait:
        try:
            resp = requests.get(
                f"{BD_API_BASE}/progress/{snapshot_id}",
                headers=_auth_headers(),
                timeout=30,
            )
            resp.raise_for_status()
            status = resp.json().get("status", "unknown")
        except requests.RequestException as e:
            print(f"    [{elapsed}s] Poll error: {e}")
            time.sleep(interval)
            elapsed += interval
            continue

        print(f"    [{elapsed}s] {status}")

        if status == "ready":
            return download_snapshot(snapshot_id)
        if status == "failed":
            print("    Snapshot FAILED")
            return []

        time.sleep(interval)
        elapsed += interval

    print(f"    Timed out after {max_wait}s")
    return []


def download_snapshot(snapshot_id: str) -> list[dict]:
    """Download completed snapshot results."""
    try:
        resp = requests.get(
            f"{BD_API_BASE}/snapshot/{snapshot_id}",
            headers=_auth_headers(),
            params={"format": "json"},
            timeout=120,
        )
        resp.raise_for_status()
        records = resp.json()
        if isinstance(records, list):
            return records
        return records.get("data", [])
    except requests.RequestException as e:
        print(f"    Download failed: {e}")
        return []


def fetch_with_unlocker(
    url: str,
    zone: str,
    as_markdown: bool = True,
) -> str | None:
    """Fetch a URL via Web Unlocker. Returns content or None."""
    body: dict = {
        "zone": zone,
        "url": url,
        "format": "raw",
        "country": "us",
    }
    if as_markdown:
        body["data_format"] = "markdown"

    try:
        resp = requests.post(
            BD_REQUEST_URL,
            headers=_auth_headers(),
            json=body,
            timeout=120,
        )
        resp.raise_for_status()

        # Unwrap envelope if present
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else None
        if data and "body" in data:
            return data["body"] if isinstance(data["body"], str) else json.dumps(data["body"])
        return resp.text
    except requests.RequestException as e:
        print(f"  Unlocker failed for {url}: {e}")
        return None


def serp_search(
    query: str,
    zone: str,
    search_type: str = "nws",
) -> dict | None:
    """Run a SERP API search. Returns parsed body or None."""
    encoded_query = query.replace(" ", "+")
    search_url = (
        f"https://www.google.com/search"
        f"?q={encoded_query}&tbm={search_type}&hl=en&gl=us&brd_json=1"
    )

    body = {"zone": zone, "url": search_url, "format": "json"}

    try:
        resp = requests.post(
            BD_REQUEST_URL,
            headers=_auth_headers(),
            json=body,
            timeout=180,
        )
        resp.raise_for_status()
        raw = resp.json()

        # Unwrap envelope: {status_code, headers, body: "<json string>"}
        if "body" in raw:
            inner = raw["body"]
            if isinstance(inner, str):
                return json.loads(inner)
            return inner
        return raw
    except (requests.RequestException, json.JSONDecodeError) as e:
        print(f"  SERP failed for '{query}': {e}")
        return None
```

**Step 2: Verify imports work**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.bright_data_client import trigger_scraper, poll_snapshot, fetch_with_unlocker, serp_search; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/bright_data_client.py
git commit -m "feat(scripts): add shared Bright Data API client with trigger/poll/unlocker/serp"
```

---

## Task 3: Create Package Structure

**Files:**
- Create: `scripts/__init__.py`
- Create: `scripts/triggers/__init__.py`
- Create: `scripts/processors/__init__.py`

**Step 1: Create empty init files**

Create all three as empty files:
- `scripts/__init__.py` (empty)
- `scripts/triggers/__init__.py` (empty)
- `scripts/processors/__init__.py` (empty)

**Step 2: Verify package import**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "import scripts.triggers; import scripts.processors; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/__init__.py scripts/triggers/__init__.py scripts/processors/__init__.py
git commit -m "chore(scripts): add package init files for triggers and processors"
```

---

## Task 4: Jobs Processor (extracted from job_scraper_service.py)

**Files:**
- Create: `scripts/processors/process_jobs.py`

**Step 1: Create `scripts/processors/process_jobs.py`**

Extract the processing pipeline from `scripts/job_scraper_service.py` (lines 218-426). This includes:

- `detect_source(raw_jobs)` — detect Indeed/LinkedIn/Glassdoor from field shapes
- `extract_skills(description)` — keyword matching against SKILL_CATEGORIES
- `search_arcgis_business(company_name)` — ArcGIS Business License geocoder
- `geocode_nominatim(address)` — Nominatim fallback geocoder
- `generate_job_id(job)` — stable dedup ID
- `process_jobs(raw_jobs, source)` — full pipeline: tag → skills → geocode
- `build_geojson_feature(job)` — convert to GeoJSON Feature
- `save_job_results(features)` — dedup and save to jobs_latest.geojson

Key changes from original:
- Import `SKILL_CATEGORIES`, `ARCGIS_BASE`, `OUTPUT_FILES`, `RAW_DIR` from `scripts.config`
- Remove duplicate config definitions
- Keep all processing logic identical

**Step 2: Verify import**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.processors.process_jobs import process_jobs, save_job_results; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/processors/process_jobs.py
git commit -m "feat(scripts): extract job processor from job_scraper_service.py"
```

---

## Task 5: News Processor (extracted from scrape_news.py + enrich_news_sentiment.py)

**Files:**
- Create: `scripts/processors/process_news.py`

**Step 1: Create `scripts/processors/process_news.py`**

Extract and combine from `scripts/scrape_news.py` (lines 94-205) and `scripts/enrich_news_sentiment.py` (lines 28-53):

- `generate_article_id(title, source_url)` — stable dedup ID
- `parse_news_results(body, category)` — extract articles from SERP response
- `enrich_article(article)` — add sentiment + misinfo scores (uses sentiment_rules.py)
- `deduplicate_articles(articles)` — remove dupes by ID
- `load_existing_articles()` — load from disk for merge
- `save_news_articles(articles)` — write to news_feed.json

Key changes from original:
- Import paths from `scripts.config`
- Integrate sentiment enrichment inline (no separate script run)
- Each article gets sentiment on save, not as a separate pass

**Step 2: Verify import**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.processors.process_news import parse_news_results, save_news_articles; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/processors/process_news.py
git commit -m "feat(scripts): extract news processor with integrated sentiment enrichment"
```

---

## Task 6: Benefits Processor (NEW)

**Files:**
- Create: `scripts/processors/process_benefits.py`

**Step 1: Create `scripts/processors/process_benefits.py`**

This is new code — parses markdown from government websites into structured eligibility data.

```python
"""Parse government website markdown into structured benefit eligibility data."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from scripts.config import OUTPUT_FILES, BENEFITS_TARGETS


def parse_income_table(markdown: str) -> dict[str, int]:
    """Extract income limits by household size from markdown tables.

    Looks for patterns like:
    | 1 | $1,644 |
    | Household of 2 | $2,229 |
    """
    limits: dict[str, int] = {}
    # Match table rows with household size and dollar amounts
    pattern = r"\|?\s*(?:Household\s+(?:of\s+)?)?(\d+)\s*\|?\s*\$?([\d,]+)"
    for match in re.finditer(pattern, markdown):
        size = match.group(1)
        amount = int(match.group(2).replace(",", ""))
        limits[size] = amount
    return limits


def parse_requirements_list(markdown: str, section_keyword: str) -> list[str]:
    """Extract bullet items under a section heading.

    Finds the heading matching section_keyword, then collects
    all lines starting with - or * until the next heading.
    """
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


def parse_benefit_markdown(markdown: str, target: dict) -> dict:
    """Parse a single benefit page markdown into structured data."""
    now = datetime.now(timezone.utc).isoformat()

    income_limits = parse_income_table(markdown)
    eligibility = parse_requirements_list(markdown, "eligib")
    how_to_apply = parse_requirements_list(markdown, "apply")
    documents = parse_requirements_list(markdown, "document")

    # If parsing found nothing, try broader patterns
    if not eligibility:
        eligibility = parse_requirements_list(markdown, "qualif")
    if not how_to_apply:
        how_to_apply = parse_requirements_list(markdown, "how to")

    return {
        "id": target["id"],
        "category": target["category"],
        "title": target["name"],
        "provider": extract_provider(markdown) or target["name"],
        "description": extract_first_paragraph(markdown),
        "eligibility": eligibility,
        "income_limits": income_limits,
        "how_to_apply": how_to_apply,
        "documents_needed": documents,
        "url": target["url"],
        "phone": extract_phone(markdown),
        "scraped_at": now,
        "source": "live_scrape",
    }


def extract_first_paragraph(markdown: str) -> str:
    """Extract the first non-heading, non-empty paragraph."""
    for line in markdown.split("\n"):
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and not stripped.startswith("|") and len(stripped) > 30:
            return stripped[:300]
    return ""


def extract_phone(markdown: str) -> str:
    """Extract first phone number from markdown."""
    match = re.search(r"[\(]?\d{3}[\)\-\s]?\s*\d{3}[\-\s]\d{4}", markdown)
    return match.group(0) if match else ""


def extract_provider(markdown: str) -> str:
    """Extract provider name from first heading."""
    for line in markdown.split("\n"):
        if line.strip().startswith("# "):
            return line.strip().lstrip("# ").strip()[:100]
    return ""


def load_fallback_services() -> list[dict]:
    """Load existing gov_services.json as fallback data."""
    path = OUTPUT_FILES["benefits"]
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            return data.get("services", [])
    return []


def merge_with_fallback(
    live_services: list[dict],
    fallback_services: list[dict],
) -> list[dict]:
    """Merge live-scraped services with fallback. Live wins on ID match."""
    live_ids = {s["id"] for s in live_services}
    kept_fallback = [s for s in fallback_services if s["id"] not in live_ids]
    return live_services + kept_fallback


def save_benefits(services: list[dict]) -> None:
    """Write enriched benefits data to gov_services.json."""
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_services": len(services),
        "categories": list({s["category"] for s in services}),
        "services": services,
    }

    path = OUTPUT_FILES["benefits"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(services)} services to {path}")
```

**Step 2: Verify import**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.processors.process_benefits import parse_benefit_markdown, save_benefits; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/processors/process_benefits.py
git commit -m "feat(scripts): add benefits processor for parsing government site markdown"
```

---

## Task 7: Housing Processor (NEW)

**Files:**
- Create: `scripts/processors/process_housing.py`

**Step 1: Create `scripts/processors/process_housing.py`**

Transforms Zillow Web Scraper API output into GeoJSON.

```python
"""Process Zillow listings into GeoJSON for the housing map layer."""

import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from scripts.config import OUTPUT_FILES


def generate_listing_id(listing: dict) -> str:
    """Generate stable dedup ID from address + price."""
    key = f"{listing.get('address', '')}__{listing.get('price', '')}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def geocode_nominatim(address: str) -> tuple[float, float] | None:
    """Geocode via Nominatim. Returns (lat, lng) or None."""
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


def process_zillow_listings(raw_listings: list[dict]) -> list[dict]:
    """Build GeoJSON features from Zillow scraper output."""
    features: list[dict] = []
    geocode_cache: dict[str, tuple[float, float] | None] = {}

    for listing in raw_listings:
        if listing.get("error"):
            continue

        address = listing.get("address") or listing.get("streetAddress") or ""
        city = listing.get("city") or "Montgomery"
        state = listing.get("state") or "AL"
        full_address = f"{address}, {city}, {state}" if address else ""

        # Get coordinates from Zillow data or geocode
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
            continue

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "id": generate_listing_id(listing),
                "address": full_address,
                "price": listing.get("price") or listing.get("unformattedPrice"),
                "price_formatted": format_price(listing.get("price")),
                "beds": listing.get("bedrooms") or listing.get("beds"),
                "baths": listing.get("bathrooms") or listing.get("baths"),
                "sqft": listing.get("livingArea") or listing.get("area"),
                "listing_type": listing.get("homeType") or listing.get("listingType", ""),
                "status": listing.get("homeStatus") or listing.get("listingStatus", ""),
                "url": listing.get("url") or listing.get("detailUrl", ""),
                "image_url": listing.get("imgSrc") or listing.get("image", ""),
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            },
        })

    return features


def format_price(price) -> str:
    """Format price as human-readable string."""
    if not price:
        return ""
    try:
        num = int(str(price).replace(",", "").replace("$", ""))
        return f"${num:,}"
    except (ValueError, TypeError):
        return str(price)


def save_housing_results(features: list[dict]) -> None:
    """Save housing GeoJSON to public/data/housing.geojson."""
    # Load existing for dedup
    path = OUTPUT_FILES["housing"]
    existing_features: list[dict] = []
    if path.exists():
        with open(path, encoding="utf-8") as f:
            existing = json.load(f)
            existing_features = existing.get("features", [])

    existing_ids = {f["properties"]["id"] for f in existing_features}
    new_features = [f for f in features if f["properties"]["id"] not in existing_ids]
    merged = new_features + existing_features

    geojson = {"type": "FeatureCollection", "features": merged}
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"Saved {len(merged)} housing listings to {path} ({len(new_features)} new)")
```

**Step 2: Verify import**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.processors.process_housing import process_zillow_listings, save_housing_results; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/processors/process_housing.py
git commit -m "feat(scripts): add housing processor for Zillow listings to GeoJSON"
```

---

## Task 8: Jobs Trigger Script

**Files:**
- Create: `scripts/triggers/trigger_jobs.py`

**Step 1: Create `scripts/triggers/trigger_jobs.py`**

```python
"""Trigger Indeed + LinkedIn + Glassdoor scrapers via Bright Data Web Scraper API.

Usage:
    python -m scripts.triggers.trigger_jobs --poll
    python -m scripts.triggers.trigger_jobs --webhook http://localhost:8787/webhook/jobs
"""

import argparse
import json
from datetime import datetime, timezone

from scripts.config import JOB_SCRAPERS, RAW_DIR
from scripts.bright_data_client import trigger_scraper, poll_snapshot
from scripts.processors.process_jobs import (
    detect_source, process_jobs, build_geojson_feature, save_job_results,
)


def run_trigger(webhook_url: str | None = None, use_poll: bool = False) -> None:
    """Trigger all job scrapers and optionally poll for results."""
    print(f"{'=' * 60}")
    print(f"TRIGGERING JOB SCRAPERS — {datetime.now().isoformat()}")
    print(f"Mode: {'poll' if use_poll else 'webhook' if webhook_url else 'fire-and-forget'}")
    print(f"{'=' * 60}")

    all_features: list[dict] = []

    for scraper in JOB_SCRAPERS:
        print(f"\n[{scraper['name']}]")
        snapshot_id = trigger_scraper(
            dataset_id=scraper["dataset_id"],
            payload=scraper["payload"],
            params=scraper["params"],
            webhook_url=webhook_url,
        )

        if snapshot_id and use_poll:
            raw_jobs = poll_snapshot(snapshot_id)
            if raw_jobs:
                save_raw_batch(scraper["name"], raw_jobs)
                valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
                processed = process_jobs(valid, scraper["name"])
                for job in processed:
                    feat = build_geojson_feature(job)
                    if feat:
                        all_features.append(feat)

    if use_poll and all_features:
        save_job_results(all_features)

    if webhook_url:
        print("\nScrapers triggered. Results will arrive via webhook.")


def save_raw_batch(source_name: str, raw_jobs: list[dict]) -> None:
    """Save raw scraper output for debugging."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = RAW_DIR / f"{source_name.lower()}_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(raw_jobs, f, indent=2)
    print(f"  Raw saved: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger Bright Data job scrapers")
    parser.add_argument("--webhook", type=str, help="Webhook URL for delivery")
    parser.add_argument("--poll", action="store_true", help="Poll for results")
    args = parser.parse_args()

    run_trigger(webhook_url=args.webhook, use_poll=args.poll)


if __name__ == "__main__":
    main()
```

**Step 2: Verify syntax**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.triggers.trigger_jobs import main; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/triggers/trigger_jobs.py
git commit -m "feat(scripts): add job trigger using shared config and client"
```

---

## Task 9: News Trigger Script

**Files:**
- Create: `scripts/triggers/trigger_news.py`

**Step 1: Create `scripts/triggers/trigger_news.py`**

Two-step pipeline: SERP discovery → Web Unlocker full article text.

```python
"""Trigger Montgomery news scraping via SERP API + Web Unlocker.

Step 1: SERP API discovers article URLs + snippets from Google News
Step 2: Web Unlocker fetches full article text as markdown

Usage:
    python -m scripts.triggers.trigger_news --poll
    python -m scripts.triggers.trigger_news --poll --skip-fulltext
"""

import argparse
import time
from datetime import datetime, timezone

from scripts.config import NEWS_QUERIES, SERP_ZONE, UNLOCKER_ZONE
from scripts.bright_data_client import serp_search, fetch_with_unlocker
from scripts.processors.process_news import (
    parse_news_results, enrich_article, deduplicate_articles,
    load_existing_articles, save_news_articles,
)


def discover_articles() -> list[dict]:
    """Step 1: Run all SERP queries to discover news articles."""
    all_articles: list[dict] = []

    for i, entry in enumerate(NEWS_QUERIES):
        query = entry["query"]
        category = entry["category"]

        print(f"\n[{i+1}/{len(NEWS_QUERIES)}] SERP: \"{query}\" ({category})")
        body = serp_search(query, zone=SERP_ZONE)

        if body:
            articles = parse_news_results(body, category)
            print(f"  Found {len(articles)} articles")
            all_articles.extend(articles)
        else:
            print(f"  No results")

        if i < len(NEWS_QUERIES) - 1:
            time.sleep(2)

    return all_articles


def fetch_full_article_text(articles: list[dict], max_articles: int = 20) -> list[dict]:
    """Step 2: Fetch full text for top articles via Web Unlocker."""
    # Only fetch for articles that don't already have a body
    need_text = [a for a in articles if not a.get("body")][:max_articles]
    print(f"\nFetching full text for {len(need_text)} articles via Web Unlocker...")

    for i, article in enumerate(need_text):
        url = article.get("sourceUrl", "")
        if not url:
            continue

        print(f"  [{i+1}/{len(need_text)}] {article['title'][:50]}...")
        content = fetch_with_unlocker(url, zone=UNLOCKER_ZONE, as_markdown=True)

        if content:
            # Take first 2000 chars of markdown as article body
            article["body"] = content[:2000]
            print(f"    Got {len(content)} chars")
        else:
            print(f"    Failed — keeping snippet only")

        time.sleep(1)

    return articles


def run_news_pipeline(skip_fulltext: bool = False) -> None:
    """Run the full news discovery + enrichment pipeline."""
    print(f"{'=' * 60}")
    print(f"NEWS SCRAPER — {datetime.now().isoformat()}")
    print(f"{'=' * 60}")

    # Step 1: Discover via SERP
    articles = discover_articles()

    # Step 2: Fetch full text via Web Unlocker
    if not skip_fulltext and articles:
        articles = fetch_full_article_text(articles)

    # Step 3: Enrich with sentiment
    for article in articles:
        enrich_article(article)

    # Step 4: Merge + dedup + save
    existing = load_existing_articles()
    merged = articles + existing
    unique = deduplicate_articles(merged)

    print(f"\nTotal: {len(articles)} new, {len(existing)} existing, {len(unique)} unique")
    save_news_articles(unique)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Montgomery news")
    parser.add_argument("--poll", action="store_true", help="Run synchronously (always true for news)")
    parser.add_argument("--skip-fulltext", action="store_true", help="Skip Web Unlocker article fetch")
    args = parser.parse_args()

    run_news_pipeline(skip_fulltext=args.skip_fulltext)


if __name__ == "__main__":
    main()
```

**Step 2: Verify syntax**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.triggers.trigger_news import main; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/triggers/trigger_news.py
git commit -m "feat(scripts): add news trigger with SERP discovery + Web Unlocker full text"
```

---

## Task 10: Benefits Trigger Script

**Files:**
- Create: `scripts/triggers/trigger_benefits.py`

**Step 1: Create `scripts/triggers/trigger_benefits.py`**

```python
"""Scrape government benefit eligibility pages via Bright Data Web Unlocker.

Fetches Alabama Medicaid, SNAP, and TANF pages as markdown,
then parses them into structured eligibility data.

Usage:
    python -m scripts.triggers.trigger_benefits --poll
"""

import argparse
import time
from datetime import datetime

from scripts.config import BENEFITS_TARGETS, UNLOCKER_ZONE
from scripts.bright_data_client import fetch_with_unlocker
from scripts.processors.process_benefits import (
    parse_benefit_markdown, load_fallback_services,
    merge_with_fallback, save_benefits,
)


def scrape_benefit_pages() -> list[dict]:
    """Fetch and parse all benefit target pages."""
    live_services: list[dict] = []

    for i, target in enumerate(BENEFITS_TARGETS):
        print(f"\n[{i+1}/{len(BENEFITS_TARGETS)}] Fetching: {target['name']}")
        print(f"  URL: {target['url']}")

        markdown = fetch_with_unlocker(
            url=target["url"],
            zone=UNLOCKER_ZONE,
            as_markdown=True,
        )

        if markdown:
            print(f"  Got {len(markdown)} chars of markdown")
            service = parse_benefit_markdown(markdown, target)
            eligibility_count = len(service.get("eligibility", []))
            income_count = len(service.get("income_limits", {}))
            print(f"  Parsed: {eligibility_count} eligibility rules, {income_count} income limits")
            live_services.append(service)
        else:
            print(f"  FAILED — will use fallback data")

        if i < len(BENEFITS_TARGETS) - 1:
            time.sleep(2)

    return live_services


def run_benefits_pipeline() -> None:
    """Run the benefits scraping pipeline with fallback."""
    print(f"{'=' * 60}")
    print(f"BENEFITS SCRAPER — {datetime.now().isoformat()}")
    print(f"{'=' * 60}")

    live_services = scrape_benefit_pages()
    fallback_services = load_fallback_services()

    merged = merge_with_fallback(live_services, fallback_services)
    print(f"\nLive: {len(live_services)}, Fallback: {len(fallback_services)}, Merged: {len(merged)}")

    save_benefits(merged)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape government benefit eligibility")
    parser.add_argument("--poll", action="store_true", help="Run synchronously")
    args = parser.parse_args()

    run_benefits_pipeline()


if __name__ == "__main__":
    main()
```

**Step 2: Verify syntax**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.triggers.trigger_benefits import main; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/triggers/trigger_benefits.py
git commit -m "feat(scripts): add benefits trigger using Web Unlocker for government sites"
```

---

## Task 11: Housing Trigger Script

**Files:**
- Create: `scripts/triggers/trigger_housing.py`

**Step 1: Create `scripts/triggers/trigger_housing.py`**

```python
"""Trigger Zillow property listing scraper via Bright Data Web Scraper API.

Usage:
    python -m scripts.triggers.trigger_housing --poll
    python -m scripts.triggers.trigger_housing --webhook http://localhost:8787/webhook/housing
"""

import argparse
from datetime import datetime

from scripts.config import DATASETS
from scripts.bright_data_client import trigger_scraper, poll_snapshot
from scripts.processors.process_housing import (
    process_zillow_listings, save_housing_results,
)


def run_trigger(webhook_url: str | None = None, use_poll: bool = False) -> None:
    """Trigger Zillow scraper for Montgomery listings."""
    print(f"{'=' * 60}")
    print(f"HOUSING SCRAPER — {datetime.now().isoformat()}")
    print(f"{'=' * 60}")

    payload = [{
        "url": "https://www.zillow.com/montgomery-al/rentals/",
    }]
    params = {
        "type": "discover_new",
        "discover_by": "url",
        "limit_per_input": "100",
    }

    print("\n[Zillow — Montgomery, AL Rentals]")
    snapshot_id = trigger_scraper(
        dataset_id=DATASETS["zillow"],
        payload=payload,
        params=params,
        webhook_url=webhook_url,
    )

    if snapshot_id and use_poll:
        raw_listings = poll_snapshot(snapshot_id)
        if raw_listings:
            print(f"\nProcessing {len(raw_listings)} listings...")
            features = process_zillow_listings(raw_listings)
            save_housing_results(features)

    if webhook_url:
        print("\nTriggered. Results will arrive via webhook.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger Zillow housing scraper")
    parser.add_argument("--webhook", type=str, help="Webhook URL for delivery")
    parser.add_argument("--poll", action="store_true", help="Poll for results")
    args = parser.parse_args()

    run_trigger(webhook_url=args.webhook, use_poll=args.poll)


if __name__ == "__main__":
    main()
```

**Step 2: Verify syntax**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.triggers.trigger_housing import main; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```
git add scripts/triggers/trigger_housing.py
git commit -m "feat(scripts): add housing trigger for Zillow via Web Scraper API"
```

---

## Task 12: FastAPI Webhook Server

**Files:**
- Create: `scripts/webhook_server.py`

**Step 1: Create `scripts/webhook_server.py`**

```python
"""Unified webhook receiver for all Bright Data deliveries.

Receives POST requests from Bright Data when scrapes complete,
routes to the appropriate processor, and saves results.

Usage:
    pip install fastapi uvicorn
    uvicorn scripts.webhook_server:app --port 8787
"""

import json
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from scripts.config import RAW_DIR
from scripts.processors.process_jobs import (
    detect_source, process_jobs, build_geojson_feature, save_job_results,
)
from scripts.processors.process_news import (
    parse_news_results, enrich_article, deduplicate_articles,
    load_existing_articles, save_news_articles,
)
from scripts.processors.process_housing import (
    process_zillow_listings, save_housing_results,
)

app = FastAPI(title="MontgomeryAI Webhook Receiver")


def save_raw_webhook(stream_type: str, data: list | dict) -> None:
    """Save raw webhook payload for debugging."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = RAW_DIR / f"webhook_{stream_type}_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@app.post("/webhook/jobs")
async def webhook_jobs(request: Request) -> JSONResponse:
    """Receive job scraper results from Bright Data."""
    raw_jobs = await request.json()
    save_raw_webhook("jobs", raw_jobs)

    source = detect_source(raw_jobs)
    valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
    processed = process_jobs(valid, source)

    features = [build_geojson_feature(j) for j in processed]
    features = [f for f in features if f is not None]
    save_job_results(features)

    return JSONResponse({"ok": True, "processed": len(features)})


@app.post("/webhook/news")
async def webhook_news(request: Request) -> JSONResponse:
    """Receive SERP news results from Bright Data."""
    raw_data = await request.json()
    save_raw_webhook("news", raw_data)

    articles = parse_news_results(raw_data, category="general")
    for article in articles:
        enrich_article(article)

    existing = load_existing_articles()
    merged = articles + existing
    unique = deduplicate_articles(merged)
    save_news_articles(unique)

    return JSONResponse({"ok": True, "articles": len(articles)})


@app.post("/webhook/housing")
async def webhook_housing(request: Request) -> JSONResponse:
    """Receive Zillow listing results from Bright Data."""
    raw_listings = await request.json()
    save_raw_webhook("housing", raw_listings)

    features = process_zillow_listings(raw_listings)
    save_housing_results(features)

    return JSONResponse({"ok": True, "listings": len(features)})


@app.get("/health")
async def health() -> JSONResponse:
    """Health check endpoint."""
    return JSONResponse({
        "status": "ok",
        "streams": ["jobs", "news", "housing", "benefits"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
```

**Step 2: Verify syntax**

Run: `cd /c/Users/User/Projects/Pegasus && python -c "from scripts.webhook_server import app; print('OK', type(app).__name__)"`
Expected: `OK FastAPI`

**Step 3: Commit**

```
git add scripts/webhook_server.py
git commit -m "feat(scripts): add FastAPI webhook server for all Bright Data streams"
```

---

## Task 13: Update .env.example with Web Unlocker

**Files:**
- Modify: `scripts/../.env.example`

**Step 1: Update `.env.example`**

Add the Web Unlocker zone fields (uncommented with placeholder values) and add a note about the new webhook server:

```
# Web Unlocker Zone
BRIGHTDATA_UNLOCKER_ZONE=web_unlocker1
BRIGHTDATA_UNLOCKER_PASSWORD=your_password_here
```

**Step 2: Commit**

```
git add .env.example
git commit -m "docs: add Web Unlocker zone to .env.example"
```

---

## Task 14: Deprecation Notes in Old Scripts

**Files:**
- Modify: `scripts/job_scraper_service.py` (add deprecation notice at top)
- Modify: `scripts/scrape_news.py` (add deprecation notice at top)
- Modify: `scripts/scrape_gov_services.py` (add deprecation notice at top)

**Step 1: Add deprecation docstring to each**

Add to the top of each file's docstring:

```python
# DEPRECATED: Use scripts/triggers/trigger_jobs.py instead.
# This file is kept for reference only.
```

**Step 2: Commit**

```
git add scripts/job_scraper_service.py scripts/scrape_news.py scripts/scrape_gov_services.py
git commit -m "chore(scripts): mark old scraping scripts as deprecated"
```

---

## Task 15: End-to-End Verification

**Step 1: Verify all imports chain correctly**

Run:
```bash
cd /c/Users/User/Projects/Pegasus
python -c "
from scripts.config import API_KEY, DATASETS, JOB_SCRAPERS, NEWS_QUERIES, BENEFITS_TARGETS
from scripts.bright_data_client import trigger_scraper, poll_snapshot, fetch_with_unlocker, serp_search
from scripts.processors.process_jobs import process_jobs, save_job_results
from scripts.processors.process_news import parse_news_results, save_news_articles
from scripts.processors.process_benefits import parse_benefit_markdown, save_benefits
from scripts.processors.process_housing import process_zillow_listings, save_housing_results
from scripts.triggers.trigger_jobs import run_trigger as trigger_jobs
from scripts.triggers.trigger_news import run_news_pipeline
from scripts.triggers.trigger_benefits import run_benefits_pipeline
from scripts.triggers.trigger_housing import run_trigger as trigger_housing
from scripts.webhook_server import app
print('ALL IMPORTS OK')
"
```
Expected: `ALL IMPORTS OK`

**Step 2: Verify webhook server starts**

Run:
```bash
cd /c/Users/User/Projects/Pegasus
timeout 5 python -m uvicorn scripts.webhook_server:app --port 8787 || true
```
Expected: Server starts on port 8787 (then times out after 5s, which is fine)

**Step 3: Verify frontend still builds**

Run:
```bash
cd /c/Users/User/Projects/Pegasus/montgomery-navigator
npm run build
```
Expected: Build succeeds with 0 errors

**Step 4: Final commit**

```
git add -A
git commit -m "feat(scripts): complete Bright Data live streams pipeline — 4 triggers, 4 processors, webhook server"
```
