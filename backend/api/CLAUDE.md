# API Layer

> **Self-Updating Rule:** Any new router, schema, or endpoint change MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| Auth / webhook secret | `deps.py` |
| CORS origins | `main.py` |
| Startup / shutdown hooks | `lifespan.py` |
| Mayor chat endpoint | `routers/chat.py` |
| Citizen chat endpoint | `routers/citizen_chat.py` |
| Comment analysis endpoint | `routers/analysis.py` |
| Roadmap endpoint | `routers/roadmap.py` |
| CV upload / stream | `routers/cv.py`, `routers/cv_stream.py` |
| Career chat / analysis | `routers/career_chat.py`, `routers/career_analyze.py` |
| Growth plan endpoints | `routers/growth.py` |
| Learning blocks endpoints | `routers/learning_block.py` |
| Growth plan schemas | `schemas/growth_schemas.py` |
| Roadmap schemas | `schemas/roadmap_schemas.py` |
| CV schemas | `schemas/cv_schemas.py` |
| Career schemas | `schemas/career_schemas.py` |
| Webhook schemas | `schemas/webhook_schemas.py` |

## Routers (`routers/`)
| File | Purpose |
|------|---------|
| `analysis.py` | Trigger batch comment analysis, fetch results and pipeline status |
| `auth.py` | Auth-related endpoints |
| `benefits.py` | Benefits listing endpoints |
| `career_analyze.py` | Career CV analysis endpoints |
| `career_chat.py` | Career chatbot SSE stream — simple Career Guide (no roadmap context) |
| `chat.py` | Mayor chatbot SSE stream |
| `citizen_chat.py` | Civic chatbot + hotspot/trend predictions |
| `citizen_profile.py` | Citizen profile CRUD endpoints |
| `comments.py` | Citizen comments on news articles |
| `cv.py` | CV upload and version management |
| `cv_latest.py` | Fetch latest CV version |
| `cv_stream.py` | CV pipeline SSE stream |
| `growth.py` | 5 growth plan endpoints (intake, gap answers, latest/history roadmap, diff) |
| `learning_block.py` | Learning blocks generation — `POST /api/growth/learning-blocks`, `GET /api/growth/learning-blocks/{analysis_id}/{path_key}` |
| `housing.py` | Housing listings endpoints |
| `jobs.py` | Job listings endpoints |
| `misinfo.py` | Misinformation detection endpoints |
| `news.py` | News articles endpoints |
| `roadmap.py` | Personalized civic roadmap generation |
| `stream.py` | Live SSE data updates (jobs, news, housing) |
| `webhooks.py` | Bright Data scraper webhook receivers |

## Schemas (`schemas/`)
| File | Purpose |
|------|---------|
| `career_schemas.py` | Career chat and analysis request/response models. `CareerChatRequest` is simple (no growth context) |
| `cv_schemas.py` | CV upload, version, and pipeline event models |
| `growth_schemas.py` | `GrowthIntakeRequest`, `GapAnswersRequest` |
| `roadmap_schemas.py` | `RoadmapRequest`, `PersonalizedRoadmap`, `RoadmapStep`, `CitizenMeta` |
| `webhook_schemas.py` | `JobRecord`, `NewsWebhookBody`, `ZillowListing` (extra="allow") |
