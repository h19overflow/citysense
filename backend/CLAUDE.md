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

POST /api/growth/learning-blocks            SkillAgent → Orchestrator → parallel LearningBlock generation
GET  /api/growth/learning-blocks/{analysis_id}/{path_key}  fetch by path
```

## DB Models — Growth Plan
| Model | Table | Key Fields |
|-------|-------|-----------|
| `GrowthIntake` | `growth_intakes` | citizen_id, career_goal, target_timeline, learning_style, external_links, crawl_results |
| `RoadmapAnalysis` | `roadmap_analyses` | citizen_id, intake_id, stage (preliminary/final), version_number, path_fill_gap, path_multidisciplinary, path_pivot, gap_questions, diff_summary |
| `LearningBlock` | `learning_blocks` | analysis_id, path_key, citizen_id, skill_step_index, block_title, block_description, learning_resources (JSONB: course/project/video items), completion_status |

## Roadmap for Next Session — Learning Journey

### Priority 1: Career chat knows the active roadmap — DONE
Implemented: `agents/career/growth_handler.py`, `agents/career/tools/roadmap_tools.py`, `agents/career/prompt.py` (GROWTH_GUIDE_PROMPT), `agents/career/tools/registry.py` (build_growth_tools), `api/routers/career_chat.py` (mode switching), `api/routers/roadmap_cache.py`, `api/schemas/career_schemas.py` (growth fields), `db/crud/growth_path.py` (JSONB merge + IDOR check).

### Priority 2: Active roadmap focused view — DONE
Frontend: `ActiveRoadmapView.tsx` (hero layout with discuss buttons), `PathCard` "Focus on this path" button, `GrowthPlanView` conditional rendering, `CareerChatBubble` dual-mode (Growth Guide vs Career Guide), `CareerChatParts.tsx` (extracted sub-components). State: `activeRoadmapPath` / `activeRoadmapAnalysisId` / `activeRoadmapPathKey` in growthSlice.

### Priority 3: Learning blocks generation — DONE
**Architecture:** SkillAgent → Orchestrator → parallel LearningBlock generation (one per skill step)

Implemented:
- **Backend agents:** `agents/growth/skill_agent.py`, `agents/growth/skill_agent_prompt.py`, `agents/growth/skill_orchestrator.py`
- **Backend core:** `core/learning_block_service.py` — orchestrates skill agent + runs generator + SSE streaming
- **Backend API:** `api/routers/learning_block.py` — `POST /api/growth/learning-blocks`, `GET /api/growth/learning-blocks/{analysis_id}/{path_key}`
- **Backend DB:** `db/models/learning_block.py`, `db/crud/learning_block.py`
- **Frontend:** `components/app/cv/growth/LearningBlockCard.tsx`, service wrapper `lib/learningBlockService.ts`

Removed (no longer needed):
- `agents/career/growth_handler.py` (Career Guide agent with roadmap mutation)
- `agents/career/tools/roadmap_tools.py` (patch_roadmap_path tool)
- `api/routers/roadmap_cache.py` (in-memory roadmap cache)
- `db/crud/growth_path.py` (JSONB roadmap mutations)
