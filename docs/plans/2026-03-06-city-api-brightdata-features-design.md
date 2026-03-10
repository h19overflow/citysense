# City API + Bright Data — Hackathon Feature Design

> **Date:** 2026-03-06
> **Goal:** 3 demo-ready features combining Montgomery ArcGIS (31 endpoints) with Bright Data scraping for the March 9 hackathon deadline.
> **Approach:** Hybrid Scripts (Approach C) — Python scripts pre-scrape data into `public/data/`. Frontend reads static JSON. Live scrape during demo presentation for dramatic effect.

---

## Feature 1: Live Job + City Intelligence Fusion

### What the user sees

On the Career Growth tab, a "Job Map" view plots scraped jobs on a Leaflet map. Each job pin popup shows:

- Job title, company, salary, source (Indeed/LinkedIn)
- Nearest bus route + estimated commute (from `transit_routes.json`)
- Nearest childcare within 2mi (from ArcGIS Daycare Centers)
- Neighborhood safety signal (green/yellow/red from 311 + violations density)

### Data flow

```
EXISTING:
  scripts/job_scraper_service.py     → public/data/jobs.geojson
  scripts/build_civic_services.py    → public/data/civic_services.geojson
  scripts/scrape_transit.py          → public/data/transit_routes.json

NEW:
  scripts/build_neighborhood_scores.py → public/data/neighborhood_scores.geojson
```

### Frontend changes

| File | Type | Purpose |
|------|------|---------|
| `cv/JobMap.tsx` | New | Leaflet map rendering `jobs.geojson` with enriched popups |
| `lib/neighborhoodScorer.ts` | New | Takes lat/lng → cross-references 311 + violations → returns score |
| `cv/CommutePanel.tsx` | Modify | Show nearest transit to selected job |

### Demo moment

Run `python scripts/job_scraper_service.py` live → new pins appear on map with full city intelligence overlays.

---

## Feature 2: Benefits Eligibility Engine

### What the user sees

On the Profile tab, a "Benefits Check" card reads the active citizen persona and shows:

- Which programs they likely qualify for (Medicaid, SNAP, TANF, childcare subsidy, LIHEAP)
- Eligibility reasoning (income vs threshold, household size)
- Next steps with links and phone numbers
- "Refresh from source" button that runs live Bright Data scrape

### Data flow

```
BASELINE:
  docs/civic-guide-reference.md  →  manually structured into  public/data/benefits_rules.json

LIVE REFRESH:
  scripts/scrape_benefits.py  →  Web Unlocker hits medicaid.alabama.gov + dhr.alabama.gov
                              →  parses eligibility thresholds
                              →  updates public/data/benefits_rules.json
```

### `benefits_rules.json` structure

```json
{
  "programs": [
    {
      "id": "medicaid",
      "name": "Alabama Medicaid",
      "category": "healthcare",
      "eligibility": {
        "income_limits": { "1": 1677, "2": 2268, "3": 2859, "4": 3450 },
        "basis": "monthly_gross",
        "residency": "alabama",
        "citizenship": "us_citizen_or_qualified"
      },
      "how_to_apply": {
        "phone": "1-800-362-1504",
        "online": "https://myalhipp.com",
        "in_person": "Montgomery County DHR, 517 Madison Ave"
      },
      "documents_needed": ["Photo ID", "Proof of income", "Proof of residency", "Social Security card"],
      "last_scraped": "2026-03-06T02:45:00Z"
    }
  ]
}
```

### Frontend changes

| File | Type | Purpose |
|------|------|---------|
| `cv/BenefitsCheck.tsx` or section in `ProfileView.tsx` | New | Reads persona → compares against rules → shows results |
| `lib/benefitsEngine.ts` | New | Pure function: `checkEligibility(persona, rules) → BenefitsResult[]` |

### Engine logic

Deterministic threshold comparisons, no AI:

```
if persona.monthly_income <= program.income_limits[persona.household_size]
  AND persona.state === "alabama"
  → LIKELY ELIGIBLE
```

### Demo moment

Switch between citizen personas (Maria → Marcus) → eligibility results change instantly. Hit "Refresh from source" → live Bright Data scrape.

---

## Feature 3: Neighborhood Intelligence Overlay

### What the user sees

On the Services map, a toggle-able heatmap layer showing neighborhood health scores per zip code.

### Scoring model

| Signal | Source | Weight | Direction |
|--------|--------|--------|-----------|
| 311 request density | ArcGIS 311 (207K records) | 30% | Negative (more = worse) |
| Code violation density | ArcGIS Violations (79K records) | 25% | Negative |
| Active construction permits | ArcGIS Permits (43K records) | 20% | Positive (investment) |
| Flood zone overlap | ArcGIS Flood Hazard | 15% | Negative (risk) |
| Paving project coverage | ArcGIS Paving (960 records) | 10% | Positive (city investment) |

Score: 0-100 per zip code. Green (70+), yellow (40-70), red (<40).

### Data flow

```
NEW:
  scripts/build_neighborhood_scores.py
    → Hits 5 ArcGIS endpoints
    → Aggregates counts per zip code
    → Normalizes, weights, computes composite score
    → Outputs public/data/neighborhood_scores.geojson
```

### Frontend changes

| File | Type | Purpose |
|------|------|---------|
| `services/NeighborhoodOverlay.tsx` | New | Leaflet GeoJSON layer with color-coded zip polygons |
| `services/ServicesView.tsx` | Modify | Add "Neighborhood Health" toggle button |

### No Bright Data needed

Pure ArcGIS feature. Strengthens the city API integration story and provides context for job/benefits features.

### Demo moment

Toggle overlay on → "This area has high 311 complaints and violations but also high construction permits — a neighborhood in transition."

---

## Scripts Summary

| Script | Status | Bright Data Product | Output |
|--------|--------|-------------------|--------|
| `job_scraper_service.py` | Exists | Web Scraper API (Indeed + LinkedIn) | `jobs.geojson` |
| `scrape_transit.py` | Exists | — | `transit_routes.json` |
| `build_civic_services_geojson.py` | Exists | — | `civic_services.geojson` |
| `scrape_benefits.py` | **New** | Web Unlocker (Medicaid, DHR) | `benefits_rules.json` |
| `build_neighborhood_scores.py` | **New** | — (ArcGIS only) | `neighborhood_scores.geojson` |

## Frontend Components Summary

| Component | Feature | New/Modify |
|-----------|---------|------------|
| `cv/JobMap.tsx` | Job Intelligence | New |
| `lib/neighborhoodScorer.ts` | Job Intelligence | New |
| `lib/benefitsEngine.ts` | Benefits | New |
| `BenefitsCheck.tsx` | Benefits | New |
| `services/NeighborhoodOverlay.tsx` | Neighborhood | New |
| `services/ServicesView.tsx` | Neighborhood | Modify |
| `cv/CommutePanel.tsx` | Job Intelligence | Modify |

## Out of Scope (Post-Hackathon)

- DuckDB local cache for ArcGIS data
- LangChain ReAct agents calling Bright Data tools
- Scheduled/cron job scraping
- spaCy NER skill matching
- Housing/rental data (Zillow scraper)
- Community events scraping
