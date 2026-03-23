# Backend — CitySense

> **Self-Updating Rule:** Any change to backend file structure, new modules, renamed files, or moved code MUST be reflected in the relevant CLAUDE.md file immediately after the change. This applies to all CLAUDE.md files in the backend tree.

## Tech Stack
- Python 3.12 + FastAPI (async)
- PostgreSQL + asyncpg (SQLAlchemy ORM)
- Redis (caching, job state, pub/sub)
- LangChain + Google Gemini (AI agents)
- langchain-docling (PDF/DOCX ingestion via Docling)
- Bright Data (web scraping + SERP)
- Langfuse (LLM observability, prompt versioning, A/B testing)
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
| `LANGFUSE_SECRET_KEY` | Langfuse auth (secret key) |
| `LANGFUSE_PUBLIC_KEY` | Langfuse auth (public key) |
| `LANGFUSE_BASE_URL` | Langfuse host URL |

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

POST /api/growth/learning-block/expand       on-demand LearningBlock for a stub skill step
```

## DB Models — Growth Plan
| Model | Table | Key Fields |
|-------|-------|-----------|
| `GrowthIntake` | `growth_intakes` | citizen_id, career_goal, target_timeline, learning_style, external_links, crawl_results |
| `RoadmapAnalysis` | `roadmap_analyses` | citizen_id, intake_id, stage (preliminary/final), version_number, path_fill_gap, path_multidisciplinary, path_pivot, gap_questions, diff_summary |
| *(LearningBlocks are generated at runtime by skill agents and stored as JSONB within RoadmapAnalysis path data — no separate DB table)* |||

## Roadmap for Next Session — Learning Journey

### Priority 1: Career chat — DONE (simplified)
Career chat is now career-only (no growth mode). Previous dual-persona system removed.

### Priority 2: Active roadmap focused view — DONE
Frontend: `ActiveRoadmapView.tsx` (renders LearningBlockCards), `GrowthPlanView` conditional rendering. State: `activeRoadmapPath` / `activeRoadmapAnalysisId` / `activeRoadmapPathKey` in growthSlice.

### Priority 3: Deep learning blocks — DONE
**Architecture:** SkillAgent → Orchestrator → parallel LearningBlock generation (first 3 detailed, rest stubs)

Implemented:
- **Backend agents:** `agents/growth/skill_agent.py`, `agents/growth/skill_agent_prompt.py`, `agents/growth/skill_orchestrator.py`
- **Backend core:** `core/growth_service_helpers.py` — `attach_learning_blocks_to_analysis()`, `extract_intake_preferences()`
- **Backend API:** `api/routers/learning_block.py` — `POST /api/growth/learning-block/expand`
- **Frontend:** `components/app/cv/growth/LearningBlockCard.tsx`, `lib/services/learningBlockService.ts`

Removed (no longer needed):
- `agents/career/growth_handler.py`, `agents/career/tools/roadmap_tools.py`
- `api/routers/roadmap_cache.py`, `db/crud/growth_path.py`
