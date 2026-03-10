# Bright Data Live Data Streams — Design

> **Date:** 2026-03-06
> **Goal:** Replace hardcoded/static data with live Bright Data feeds across 4 streams
> **Priority:** Demo impact — jobs, news, benefits, housing
> **Deadline:** March 9, 2026 (hackathon submission)

---

## Problem

The scraping scripts currently hardcode ~800 lines of static data (government eligibility rules, transit schedules, civic service details) and leave key fields empty (news article bodies). Bright Data is only used for job discovery and SERP snippets. The platform supports Web Scraper API, SERP API, Web Unlocker, Scraping Browser, and Crawl API — we're using 2 of 5.

## Solution

Build a unified pipeline with:
1. **Shared config + client** — eliminate duplicated API keys, dataset IDs, and request code
2. **4 trigger scripts** — each targeting a Bright Data product type
3. **4 processors** — each transforming raw data into frontend-ready JSON/GeoJSON
4. **1 FastAPI webhook server** — receives all Bright Data deliveries
5. **Polling fallback** — every trigger works without the webhook server

## Architecture

```
Trigger Scripts (--poll or --webhook)
├── trigger_jobs.py      → Web Scraper API (Indeed/LinkedIn/Glassdoor)
├── trigger_news.py      → SERP API + Web Unlocker (discovery + full text)
├── trigger_benefits.py  → Web Unlocker (Medicaid/SNAP/TANF)
└── trigger_housing.py   → Web Scraper API (Zillow)
        │
        │ webhook POST or poll result
        ▼
Processors
├── process_jobs.py      → skills extraction + geocoding → jobs_latest.geojson
├── process_news.py      → sentiment + dedup → news_feed.json
├── process_benefits.py  → markdown parse → gov_services.json
└── process_housing.py   → geocoding → housing.geojson
        │
        ▼
Frontend (public/data/)
```

## File Structure

```
scripts/
├── config.py                    ← Env vars, dataset IDs, paths, search queries
├── bright_data_client.py        ← Shared: trigger, poll, unlocker fetch, serp search
├── webhook_server.py            ← FastAPI: POST /webhook/{stream_type}
├── triggers/
│   ├── __init__.py
│   ├── trigger_jobs.py
│   ├── trigger_news.py
│   ├── trigger_benefits.py
│   └── trigger_housing.py
├── processors/
│   ├── __init__.py
│   ├── process_jobs.py          ← Extracted from job_scraper_service.py
│   ├── process_news.py          ← Extracted from scrape_news.py + enrich_news_sentiment.py
│   ├── process_benefits.py      ← NEW: markdown → structured eligibility
│   └── process_housing.py       ← NEW: Zillow JSON → GeoJSON
├── sentiment_rules.py           ← Kept as-is
└── (old scripts kept but marked deprecated)
```

## Stream Details

### Stream 1: Jobs (Web Scraper API)

**Bright Data products:** Web Scraper API (3 pre-built scrapers)
**Dataset IDs:** Indeed `gd_l4dx9j9sscpvs7no2`, LinkedIn `gd_lpfll7v5hcqtkxl6l`, Glassdoor `gd_lpfbbndm1xnopbrcr0`
**Input:** `location: "Montgomery, AL"`, `keyword: "jobs"`, discovery mode
**Processing:** Skill extraction (7 categories, 70+ keywords) + ArcGIS Business License geocoding + Nominatim fallback
**Output:** `public/data/jobs_latest.geojson`
**What changes:** Extracted from monolithic `job_scraper_service.py`, uses shared client, Glassdoor salary data now extracted

### Stream 2: News (SERP API + Web Unlocker)

**Bright Data products:** SERP API (discovery) + Web Unlocker (full article text)
**Step 1:** SERP API with 22 Montgomery news queries across 5 categories
**Step 2 (NEW):** Web Unlocker fetches each article URL as markdown → fills `body` field
**Processing:** Sentiment scoring + dedup + merge with existing
**Output:** `public/data/news_feed.json` — now with full article bodies
**What changes:** Articles no longer have empty `body` field. Uses Web Unlocker markdown mode for clean LLM-ready text.

### Stream 3: Benefits (Web Unlocker)

**Bright Data products:** Web Unlocker (markdown mode)
**Targets:**

| Page | URL |
|------|-----|
| Alabama Medicaid | `https://medicaid.alabama.gov` |
| SNAP/Food Stamps | `https://dhr.alabama.gov/food-assistance/` |
| TANF | `https://dhr.alabama.gov/temporary-assistance/` |

**Processing:** Parse markdown for income tables, eligibility requirements, application steps. Falls back to current hardcoded data if scrape fails.
**Output:** `public/data/gov_services.json` — same schema, live data
**What changes:** Replaces ~250 lines of hardcoded eligibility rules with live-scraped data. FPL numbers and income limits stay current.

### Stream 4: Housing (Web Scraper API)

**Bright Data products:** Web Scraper API (Zillow `gd_lfqkr8wm13ixtbd8f5`)
**Input:** Montgomery, AL property listings
**Processing:** Geocode addresses → build GeoJSON features
**Output:** `public/data/housing.geojson`
**What changes:** Entirely new data stream. Enables housing overlay on the Leaflet map alongside jobs.

## Shared Modules

### config.py

- All credentials from `os.environ[]` (no hardcoded fallbacks)
- Dataset ID registry (single dict, all scrapers)
- Search query definitions (news queries, job search params)
- File path constants (DATA_DIR, output files)
- Skill categories (moved from job_scraper_service.py)

### bright_data_client.py

- `trigger_scraper(dataset_id, payload, params, webhook_url=None)` → `snapshot_id`
- `poll_snapshot(snapshot_id, max_wait=600, interval=15)` → `list[dict]`
- `fetch_with_unlocker(url, zone, as_markdown=True)` → `str`
- `serp_search(query, zone, country="us")` → `dict`
- All functions handle retries, timeouts, error logging

### webhook_server.py

FastAPI app with routes:
- `POST /webhook/jobs` → `process_jobs` → save
- `POST /webhook/news` → `process_news` → save
- `POST /webhook/benefits` → `process_benefits` → save
- `POST /webhook/housing` → `process_housing` → save
- `GET /health` → status of all streams

Port: 8787 (same as existing). Run: `uvicorn scripts.webhook_server:app --port 8787`

## Prerequisites

### Web Unlocker Zone Setup

1. Bright Data dashboard → "Add Zone" → Web Unlocker
2. Zone name: `web_unlocker1`
3. Enable "Premium domains" for government sites
4. Copy zone password → add to `.env`:
   ```
   BRIGHTDATA_UNLOCKER_ZONE=web_unlocker1
   BRIGHTDATA_UNLOCKER_PASSWORD=<password>
   ```

### Python Dependencies

```
pip install fastapi uvicorn requests beautifulsoup4
```

## Demo Flow

1. Start webhook server: `uvicorn scripts.webhook_server:app --port 8787`
2. Trigger jobs: `python -m scripts.triggers.trigger_jobs --poll` → show live Indeed/LinkedIn data
3. Trigger news: `python -m scripts.triggers.trigger_news --poll` → show SERP + full articles
4. Trigger benefits: `python -m scripts.triggers.trigger_benefits --poll` → show live Medicaid rules
5. Trigger housing: `python -m scripts.triggers.trigger_housing --poll` → show Zillow listings
6. Open frontend → all 4 data streams visible on the map and in panels

## Verification

- [ ] `config.py` loads all env vars without fallbacks; raises on missing key
- [ ] `bright_data_client.py` trigger + poll cycle works for Indeed dataset
- [ ] `trigger_news.py --poll` fills `body` field on at least 5 articles
- [ ] `trigger_benefits.py --poll` returns structured Medicaid eligibility data
- [ ] `trigger_housing.py --poll` returns geocoded Zillow listings
- [ ] `webhook_server.py` starts, `/health` returns 200
- [ ] Each processor writes valid JSON/GeoJSON to `public/data/`
- [ ] Old scripts still work (not broken, just deprecated)
- [ ] `npm run build` passes with no errors in frontend
