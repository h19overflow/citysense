# Backend — CitySense

> **Self-Updating Rule:** Any change to backend file structure, new modules, renamed files, or moved code MUST be reflected in the relevant CLAUDE.md file immediately after the change. This applies to all CLAUDE.md files in the backend tree.

## Tech Stack
- Python 3.12 + FastAPI (async)
- PostgreSQL + asyncpg (SQLAlchemy ORM)
- Redis (caching, job state, pub/sub)
- LangChain + Google Gemini (AI agents)
- langchain-docling (PDF/DOCX ingestion via Docling)
- Bright Data (web scraping + SERP)
- Clerk (JWT auth)
- Pydantic (schemas/validation)

## Architecture Layers
```
API (routers, schemas, deps) → Core (business logic) → DB (models, CRUD)
                              → Agents (LangChain/Gemini pipelines)
                              → Workers (Celery tasks, Redis broker)
```

## Directory Map
| Directory | Purpose | Details |
|-----------|---------|---------|
| `api/` | FastAPI routers, schemas, auth, deps | → [api/CLAUDE.md](api/CLAUDE.md) |
| `db/` | SQLAlchemy models, CRUD, session | → [db/CLAUDE.md](db/CLAUDE.md) |
| `core/` | Business logic, scrapers, predictive, CV pipeline, growth service | → [core/CLAUDE.md](core/CLAUDE.md) |
| `agents/` | AI agents (mayor, citizen, career, growth, curriculum) | → [agents/CLAUDE.md](agents/CLAUDE.md) |
| `workers/` | Celery tasks (CV analysis, future domains) | → [workers/CLAUDE.md](workers/CLAUDE.md) |
| `scripts/` | DB init, seeding, data building | → [scripts/CLAUDE.md](scripts/CLAUDE.md) |
| `tests/` | Pytest test suite | 13+ test modules |
| `data/` | JSON data files, analysis results | Runtime data |
| `config.py` | Env-based config (Bright Data, paths, ArcGIS) | Single file |

## Key Entry Points
- `api/main.py` — FastAPI app, lifespan, router registration
- `db/session.py` — Database engine + session factory
- `config.py` — All env-based configuration
- `core/exceptions.py` — Exception hierarchy (AppException base)

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BRIGHTDATA_API_KEY` | Bright Data auth |
| `CLERK_PUBLISHABLE_KEY` | Clerk JWT issuer |
| `CLERK_SECRET_KEY` | Clerk Backend API |
| `WEBHOOK_SECRET` | Bright Data webhook auth |
| `REDIS_URL` | Redis cache (optional) |
| `GEMINI_API_KEY` | Google Generative AI |
| `AUTO_SCRAPE` | Enable background scraping (1/0) |

## CV Pipeline Architecture
```
API POST /cv/upload → Celery task (Redis broker) → cv_pipeline.run_cv_pipeline()
                                                      ├── Ingest (langchain-docling)
                                                      ├── Analyze pages (parallel, Gemini)
                                                      ├── Aggregate results
                                                      └── Persist (CVVersion, hash dedup)
SSE /cv/jobs/{id}/stream ← Redis pub/sub (cv_progress:{id})
```

## Growth Plan Pipeline Architecture
```
POST /api/growth/intake
  → create_intake_record (DB sync) → BackgroundTask(run_intake_pipeline) → {intake_id}

run_intake_pipeline (background)
  → create_progress_queue → run_crawl_pipeline (BrightData parallel)
  → run_preliminary_analysis (Gemini) → persist_analysis → close_progress_queue

GET /api/growth/intake/{intake_id}/status   SSE, no auth (UUID is sufficient)
POST /api/growth/roadmap/answers            gap answers → final analysis
GET  /api/growth/roadmap/latest             restore roadmap on page load
GET  /api/growth/roadmap/history            all versions
GET  /api/growth/roadmap/{id1}/{id2}/diff   compare two versions
```

## DB Models — Growth Plan
| Model | Table | Key Fields |
|-------|-------|-----------|
| `GrowthIntake` | `growth_intakes` | citizen_id, career_goal, target_timeline, learning_style, external_links, crawl_results |
| `RoadmapAnalysis` | `roadmap_analyses` | citizen_id, intake_id, stage (preliminary/final), version_number, path_fill_gap, path_multidisciplinary, path_pivot, gap_questions, diff_summary |
| `Curriculum` | `curriculums` | **NOT YET BUILT** — analysis_id, path_key, items (per skill step: course/project/video) |

## Roadmap for Next Session — Learning Journey

### Priority 1: Career chat knows the active roadmap
**Why first:** Highest UX impact, smallest scope. Connects existing systems.

1. Add `active_roadmap_path: dict | None` and `active_roadmap_analysis_id: str | None` to career chat request schema (`api/schemas/career_schemas.py`)
2. In `api/routers/career_chat.py` context prefix builder: when `active_roadmap_path` present, inject `## ACTIVE GROWTH PATH` section
3. Add `patch_roadmap` LangChain tool to `agents/career/tools/` that calls `PATCH /api/growth/roadmap/{id}`
4. New endpoint: `PATCH /api/growth/roadmap/{analysis_id}` in `api/routers/growth.py`
5. Service + CRUD: `patch_roadmap_path()` in `core/growth_service.py` + `update_roadmap_path_fields()` in `db/crud/growth.py`

### Priority 2: Active roadmap focused view (frontend-only)
**Why second:** No new backend needed — uses existing roadmap data.

Add `activeRoadmapPath` + `activeRoadmapAnalysisId` to global state. `PathCard` gets "Focus on this" button. `GrowthPlanView` shows `ActiveRoadmapView` (new component) when a path is selected.

### Priority 3: Curriculum builder
**Why third:** Most complex, needs new agent + DB model + SSE + frontend chat UI.

See full spec in `agents/CLAUDE.md` → "Next Steps — Growth Plan Iteration 2 → #3 Curriculum builder agent"

New files needed:
- `agents/growth/curriculum_agent.py`
- `agents/growth/curriculum_prompts.py`
- `agents/growth/tools/course_search_tool.py`
- `agents/growth/tools/project_search_tool.py`
- `core/curriculum_service.py`
- `db/models/curriculum.py`
- `db/crud/curriculum.py`
- `api/routers/curriculum.py`
- Frontend: `growth/CurriculumBuilder.tsx`
