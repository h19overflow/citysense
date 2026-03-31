# CitySense

AI-powered civic intelligence platform for Montgomery, Alabama. Maps services, analyzes community sentiment, predicts trends, and guides residents through benefits and career growth.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![Hackathon](https://img.shields.io/badge/WWV%202026-$5k%20prize-orange)

## Demo

[![CitySense Demo](https://img.youtube.com/vi/DeUTCx11mdI/maxresdefault.jpg)](https://www.youtube.com/watch?v=DeUTCx11mdI&feature=youtu.be)

## What It Does

**For residents:**
- Browse 8 categories of city services on an interactive map
- Read community news with AI-generated sentiment and misinformation scores
- Search jobs aggregated from Indeed, LinkedIn, and Glassdoor
- Chat with an AI assistant that knows Montgomery's services, benefits, and programs
- Get personalized roadmaps for benefits eligibility and career growth

**For city leaders:**
- Real-time sentiment dashboards across community topics
- Predictive hotspot heatmap for complaint clustering
- AI-generated Mayor's Brief summarizing community trends
- Comment analysis and trend tracking

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Leaflet, Clerk |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2.0, asyncpg |
| **AI** | Google Gemini, LangGraph multi-agent workflows |
| **Data** | PostgreSQL, Redis (caching), Bright Data (scraping), ArcGIS REST API |
| **Testing** | pytest, pytest-asyncio, Vitest |

## Architecture

```mermaid
graph TB
    FE["Frontend<br/>(React + TypeScript)<br/>:8080"]
    API["FastAPI<br/>(16 routers)<br/>:8082"]
    DB[(PostgreSQL<br/>7 models)]
    Redis[(Redis<br/>cache)]
    Agents["LangGraph<br/>Citizen + Roadmap<br/>Agents"]
    Gemini["Google Gemini"]
    BD["Bright Data<br/>Scraper API"]
    ArcGIS["ArcGIS<br/>REST API"]

    FE -->|HTTP + SSE| API
    API --> DB
    API --> Redis
    API --> Agents
    Agents --> Gemini
    BD -->|Webhooks| API
    API -->|Trigger| BD
    API --> ArcGIS

    style FE fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style API fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    style Redis fill:#dc382d,stroke:#333,stroke-width:2px,color:#fff
    style Agents fill:#bd10e0,stroke:#333,stroke-width:2px,color:#fff
    style Gemini fill:#fbbc04,stroke:#333,stroke-width:2px,color:#000
    style BD fill:#f5a623,stroke:#333,stroke-width:2px,color:#000
    style ArcGIS fill:#4a90e2,stroke:#333,stroke-width:2px,color:#fff
```

## Data Pipeline

```mermaid
sequenceDiagram
    participant Sched as Scrape Scheduler
    participant BD as Bright Data
    participant Proc as Data Processor
    participant DB as PostgreSQL
    participant Cache as Redis
    participant SSE as SSE Broadcaster
    participant FE as Frontend

    Sched->>BD: Trigger scrape (jobs / news / housing)
    BD-->>Proc: Raw data via webhook
    Proc->>Proc: Validate, geocode, enrich, dedup
    Proc->>DB: Bulk upsert (ON CONFLICT DO UPDATE)
    Proc->>Cache: Invalidate stale keys
    Proc->>SSE: broadcast_event(type, data)
    SSE->>FE: EventSource push

    Note over FE,Cache: API reads hit Redis first (5-min TTL),<br/>fall through to DB on cache miss
```

**Data sources:** Jobs (Indeed + LinkedIn + Glassdoor), News (22 Google News queries), Housing (Zillow), Benefits (Alabama gov sites), Services (ArcGIS 8 layers)

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Health check |
| `GET` | `/api/stream` | SSE stream for live data |
| `GET` | `/api/news` | News articles (cached, paginated) |
| `GET` | `/api/news/{id}` | Single article detail |
| `GET` | `/api/jobs` | Job listings as GeoJSON |
| `GET` | `/api/housing` | Housing listings as GeoJSON |
| `GET` | `/api/benefits` | Government benefit services |
| `GET` | `/api/comments` | News comments |
| `POST` | `/api/comments` | Post a comment |
| `POST` | `/api/citizen-chat` | Citizen AI assistant |
| `POST` | `/api/chat` | Mayor AI chat (SSE) |
| `POST` | `/api/roadmap/generate` | Personalized service roadmap |
| `POST` | `/api/analysis/run` | Trigger sentiment analysis |
| `GET` | `/api/analysis/results` | Retrieve analysis results |
| `GET` | `/api/predictions/hotspots` | Predictive complaint hotspots |
| `GET` | `/api/predictions/trends` | Category trend analysis |
| `POST` | `/api/webhook/jobs` | Ingest jobs from Bright Data |
| `POST` | `/api/webhook/news` | Ingest news from Bright Data |
| `POST` | `/api/webhook/housing` | Ingest housing from Bright Data |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Backend

```bash
uv sync
cp .env.example .env   # fill in API keys

# Create tables and seed from JSON exports
uv run python -m backend.scripts.create_tables
uv run python -m backend.scripts.seed_from_json

# Start server
uvicorn backend.api.main:app --reload --port 8082
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:8080
```

### Verify

```bash
curl http://localhost:8082/health
# {"status":"ok","streams":["jobs","news","housing","benefits"]}
```

### Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/citysense
REDIS_URL=redis://localhost:6379
BRIGHTDATA_API_KEY=...
GEMINI_API_KEY=...
CLERK_SECRET_KEY=...
```

## Project Structure

```
citysense/
├── frontend/                    React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── app/services/    Map navigator (19 files)
│   │   │   ├── app/news/        News feed + comments (25 files)
│   │   │   ├── app/admin/       Admin dashboards (20 files)
│   │   │   ├── app/cv/          Career growth (16 files)
│   │   │   └── ui/              shadcn/ui primitives
│   │   ├── lib/                 State, services, types
│   │   └── pages/               Route-level components
│   └── public/data/             Static JSON/GeoJSON exports
│
├── backend/                     FastAPI + Python
│   ├── api/routers/             16 route modules
│   ├── agents/                  LangGraph citizen + roadmap agents
│   ├── core/
│   │   ├── data_scraping/       4 scrapers (Strategy pattern)
│   │   ├── predictive/          Hotspot scoring, trend analysis
│   │   ├── redis_client.py      Redis cache singleton
│   │   └── sse_broadcaster.py   Server-Sent Events
│   ├── db/
│   │   ├── models/              7 SQLAlchemy models
│   │   └── crud/                Async CRUD with bulk upsert
│   ├── scripts/                 Seed, migrations, table creation
│   └── tests/                   151 tests (pytest)
│
├── docs/                        Plans, specs, helper prompts
└── pyproject.toml               Python dependencies (uv)
```

## Running Tests

```bash
# Backend — 151 tests
python -m pytest backend/tests/ -v

# Frontend — 140+ tests
cd frontend && npx vitest run
```

## Code Standards

- **File limit:** 150 lines max (split if exceeded)
- **Function limit:** 30 lines max (extract helpers)
- **Type hints:** Required on all arguments and returns
- **Naming:** Verb phrases for functions (`get_user_by_email`, not `fetch`)
- **Commits:** `feat|fix|refactor|test|docs(scope): description`
- **Architecture:** API → Service → Data (API never imports DB models directly)

## Hackathon

Built for the **World Wide Vibes Hackathon** (WWV March 2026) by GenAI.Works Academy. $5,000 prize pool. Bright Data integration earns bonus points across 4 data streams with webhook ingestion and scheduled scraping.

---

Built for Montgomery, Alabama.
