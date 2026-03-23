# Core Business Logic

> **Self-Updating Rule:** Any new scraper, service, or module added to `core/` MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| Exception types | `exceptions.py` |
| Redis caching | `redis_client.py` |
| SSE broadcasting | `sse_broadcaster.py` |
| Scraper base class | `data_scraping/base.py` |
| News scraping | `data_scraping/scrapers/news.py`, `scrapers/news_helpers.py` |
| Job scraping | `data_scraping/scrapers/jobs.py`, `scrapers/jobs_helpers.py` |
| Housing scraping | `data_scraping/scrapers/housing.py` |
| Benefits scraping | `data_scraping/scrapers/benefits.py` |
| Bright Data API | `data_scraping/bright_data_client.py` |
| Scraper scheduling | `data_scraping/scheduler.py` |
| Geocoding | `data_scraping/geo/geocoding.py` |
| Sentiment scoring | `data_scraping/sentiment_rules.py` |
| Scraper payloads | `data_scraping/payloads.py` |
| Analysis schemas | `data_scraping/schemas.py` |
| Hotspot scoring | `predictive/hotspot_scorer.py` |
| Trend detection | `predictive/trend_detector.py` |
| Predictive config | `predictive/hotspot_config.py` |
| CV pipeline orchestration | `cv_pipeline/pipeline.py` |
| CV pipeline schemas | `cv_pipeline/schemas.py` |
| CV document ingestion | `cv_pipeline/components/ingestor.py` |
| CV result aggregation | `cv_pipeline/components/aggregator.py` |
| CV job tracking (Redis) | `cv_pipeline/job_tracker.py` |
| CV DB persistence | `cv_pipeline/db_persist.py` |
| CV background worker | `cv_pipeline/worker.py` |
| Growth plan orchestration | `growth_service.py`, `growth_service_helpers.py` |
| Growth plan progress bus | `growth_progress.py` |
| Learning blocks integration | `growth_service_helpers.py` (`attach_learning_blocks_to_analysis`) |

## Core Files
| File | Purpose |
|------|---------|
| `exceptions.py` | `AppException` base → `ValidationError`, `NotFoundError`, `ConflictError`, `AuthError`, `ExternalServiceError` |
| `redis_client.py` | `RedisCache` singleton (fail-open), `cache` global instance |
| `sse_broadcaster.py` | In-memory event broadcaster for SSE clients |
| `growth_service.py` | `create_intake_record`, `run_intake_pipeline` (BackgroundTask), `process_gap_answers`, `get_latest_roadmap`, `get_roadmap_history`, `compute_roadmap_diff` |
| `growth_service_helpers.py` | `run_crawl_pipeline`, `extract_cv_summary`, `persist_analysis`, `intake_to_dict`, `serialize_analysis`, `extract_intake_preferences`, `attach_learning_blocks_to_analysis` |
| `growth_progress.py` | In-process `asyncio.Queue` event bus keyed by `intake_id` — `create_progress_queue`, `get_progress_queue`, `emit_progress`, `close_progress_queue` |

## Growth Plan Pipeline — Architecture
```
POST /api/growth/intake
  → create_intake_record (DB, sync)
  → BackgroundTasks.add_task(run_intake_pipeline)
  → return {"intake_id": "..."}          ← immediate response

run_intake_pipeline (background)
  → create_progress_queue(intake_id)
  → run_crawl_pipeline (BrightData, per-URL parallel)
  → run_preliminary_analysis (Gemini)
  → persist_analysis (DB)
  → close_progress_queue(intake_id, analysis_id)  ← always in finally

GET /api/growth/intake/{intake_id}/status  (SSE, no auth)
  → polls queue → streams progress events → done event includes analysis_id

POST /api/growth/roadmap/answers
  → process_gap_answers → run_final_analysis → persist_analysis

GET /api/growth/roadmap/latest       → get_latest_roadmap
GET /api/growth/roadmap/history      → list all versions
GET /api/growth/roadmap/{id1}/{id2}/diff → compute_roadmap_diff
```

## Growth Plan Pipeline — Learning Blocks Integration
```
run_intake_pipeline (background, after preliminary analysis)
  → extract_intake_preferences(intake_form)
  → attach_learning_blocks_to_analysis(analysis_data, cv_data, intake_prefs)
      → FOR EACH path (fill_gap, multidisciplinary, pivot):
          → generate_learning_blocks(skill_steps, cv_slice, ..., max_detailed=3)
              → asyncio.gather(run_skill_agent(...) for first N steps)
              → stub blocks for remaining steps
          → attach as learning_blocks[] on path dict

POST /api/growth/learning-block/expand (on-demand)
  → load analysis path + skill step by index
  → generate_single_learning_block(skill_name, skill_why, ...)
  → return LearningBlock JSON
```

## Data Scraping (`data_scraping/`)
| File | Purpose |
|------|---------|
| `base.py` | `BaseScraper` abstract class (fetch → process → dedup → save → broadcast) |
| `bright_data_client.py` | Web Scraper API: `trigger_and_collect()`, `trigger_scraper()`, `poll_snapshot()` — Page fetch: `fetch_with_unlocker(url, zone)` returns HTML via `WebUnlocker.get_source()` — SERP: `serp_search()`, `serp_maps_search()` |
| `scheduler.py` | Scraper scheduling (interval-based loop) |
| `payloads.py` | Search queries, scraper configs |
| `schemas.py` | `ArticleAnalysis`, `CommentAnalysis`, `AnalysisResults` Pydantic models |
| `sentiment_rules.py` | `score_sentiment()`, `score_misinfo_risk()`, `build_summary()` |
| `scrapers/news.py` | `NewsScraper` — SERP + full-text + sentiment + geocoding |
| `scrapers/news_helpers.py` | `parse_serp_results()`, `article_to_row()` |
| `scrapers/jobs.py` | `JobsScraper` — Indeed/LinkedIn/Glassdoor |
| `scrapers/jobs_helpers.py` | `extract_skills()`, `feature_to_row()` |
| `scrapers/housing.py` | `HousingScraper` — Zillow |
| `scrapers/benefits.py` | `BenefitsScraper` — government services |
| `geo/geocoding.py` | ArcGIS, Nominatim, jittered fallback |
| `geo/location.py` | `Location` dataclass |
| `geo/constants.py` | Montgomery coordinates, jitter radius |

## Predictive Analytics (`predictive/`)
| File | Purpose |
|------|---------|
| `hotspot_scorer.py` | `compute_hotspots()` — weighted scoring by neighborhood |
| `trend_detector.py` | `detect_trends()` — rising/falling/stable by category |
| `hotspot_config.py` | Risk thresholds, weights |
| `hotspot_helpers.py` | `collect_area_stats()`, `score_area()`, `resolve_risk_level()` |
| `models.py` | `PredictionResult`, `TrendResult` dataclasses |
| `mock_data.py` | Test data loader (complaints, events) |

## CV Pipeline (`cv_pipeline/`)
| File | Purpose |
|------|---------|
| `pipeline.py` | `run_cv_pipeline()` — async generator yielding `PipelineEvent` per stage/page |
| `schemas.py` | `ExperienceEntry`, `EducationEntry`, `PageAnalysis`, `CVAnalysisResult`, `JobStatus`, `PipelineEvent`, `JobState` |
| `components/ingestor.py` | `ingest_cv()`, `extract_page_contents()` — langchain-docling PDF/DOCX loader |
| `components/aggregator.py` | `aggregate_page_results()` — merge per-page extractions |
| `job_tracker.py` | `save_job_state()`, `load_job_state()`, `publish_event()` — Redis job state + pub/sub |
| `db_persist.py` | `persist_cv_result()` — save `CVAnalysisResult` as versioned `CVVersion` row |
| `worker.py` | `create_job()`, `execute_job()` — background task runner |
