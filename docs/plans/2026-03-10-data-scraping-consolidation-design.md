# Data Scraping Consolidation — Strategy Pattern

**Date:** 2026-03-10
**Status:** Approved

## Problem

Scraping logic is scattered across 17+ files in `processors/`, `triggers/`, and `core/scrape_scheduler.py`. Adding a new scraper requires touching 5+ files across 3 directories. No shared interface — each stream is bespoke.

## Goals

- Single base class absorbs all shared logic (dedup, save, broadcast, geocode)
- One file per scraper with fetch + process + save in one place
- Modular folder structure that's easy to navigate and extend
- Adding a new scraper = 1 new file + register it

## Target Structure

```
backend/core/data_scraping/
├── __init__.py               # Public API exports
├── base.py                   # BaseScraper ABC — all shared logic
├── scheduler.py              # Registry + interval loop
├── schemas.py                # Pydantic models for LLM structured output
├── scrapers/
│   ├── __init__.py           # Exports all scraper classes
│   ├── jobs.py               # JobsScraper (Indeed/LinkedIn/Glassdoor)
│   ├── news.py               # NewsScraper (SERP + sentiment + geocoding)
│   ├── housing.py            # HousingScraper (Zillow)
│   └── benefits.py           # BenefitsScraper (Gov pages via Web Unlocker)
├── geo/
│   ├── __init__.py           # Exports geocoding functions
│   ├── geocoding.py          # Nominatim + ArcGIS helpers
│   └── constants.py          # Montgomery neighborhoods, bounds, landmarks

backend/agents/
├── __init__.py
└── comment_analysis.py       # LLM comment analysis (Gemini) — post-processor
```

## BaseScraper Contract

```python
class BaseScraper(ABC):
    name: str                    # "jobs", "news", etc.
    output_file: Path            # Where to save results
    event_type: str              # SSE broadcast event name
    output_format: str           # "geojson" | "json"

    # Subclasses implement these 3 methods
    @abstractmethod
    def fetch(self) -> list[dict]: ...

    @abstractmethod
    def process(self, raw: list[dict]) -> list[dict]: ...

    @abstractmethod
    def generate_id(self, record: dict) -> str: ...

    # Base class provides (zero code in subclasses)
    def run(self) -> int             # Template method: fetch → process → dedup → save → broadcast
    def deduplicate(self, new, existing) -> list[dict]
    def load_existing(self) -> list[dict]
    def save(self, records) -> None  # Handles geojson and json formats
    def broadcast(self, records) -> None
```

## Deleted After Migration

- `backend/processors/` — entire directory
- `backend/triggers/` — entire directory
- `backend/core/scrape_scheduler.py` — replaced by `data_scraping/scheduler.py`

## What Stays Unchanged

- `core/bright_data_client.py` — scrapers import it
- `core/sse_broadcaster.py` — base class calls it
- `core/sentiment_rules.py` — news scraper imports it
- `core/payloads.py` — jobs scraper imports JOB_SCRAPERS config
- `config.py` — output paths, dataset IDs
- Webhook routers — updated to use scraper classes

## Adding a New Scraper

1. Create `scrapers/my_scraper.py` — subclass BaseScraper
2. Implement `fetch()`, `process()`, `generate_id()`
3. Export from `scrapers/__init__.py`
4. Register in `scheduler.py`
