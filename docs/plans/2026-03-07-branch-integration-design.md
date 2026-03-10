# Branch Integration Design

**Date:** 2026-03-07
**Branches:** `integrate-services-roadmap`, `theasrk`, `services_roadmap`
**Approach:** Manual cherry-pick and adapt (no git merge)

## Context

Three unmerged branches built features against an older codebase. Main has since been
heavily restructured (rebranded to MyMontgomery, redesigned services directory, news page,
admin dashboard). A git merge would produce hundreds of conflicts.

## Integration Scope

### 1. Services Roadmap (from `integrate-services-roadmap`)

Personalized step-by-step civic service roadmap generator using Gemini 2.0 Flash.
Citizens click "Get Step-by-Step Guide" on any service → backend generates a personalized
roadmap based on their profile (income, household, disabilities) → frontend shows progress UI.

**New backend files:**
- `backend/agents/roadmap_agent.py` — Gemini-based Retrieve→Reason→Validate pipeline
- `backend/core/redis_client.py` — Optional Redis caching (fails gracefully)
- `backend/api/schemas/roadmap_schemas.py` — CitizenMeta, RoadmapStep, PersonalizedRoadmap
- `backend/api/routers/roadmap.py` — POST `/api/roadmap/generate`

**New frontend files:**
- `ServiceRoadmapView.tsx` — Step-by-step progress panel with checkmarks
- `ChatRoadmapCard.tsx` — Roadmap displayed as chat artifact

**Modified frontend files:**
- `GuideExpandedContent.tsx` — Add "Get Step-by-Step Guide" button
- `ServicesView.tsx` — Add `"roadmap"` mode
- `appContext.tsx` — Add roadmap state (activeRoadmap, roadmapCompletedStepIds)
- `types.ts` — Add RoadmapStep, PersonalizedRoadmap types

**Modified backend files:**
- `backend/api/main.py` — Register roadmap router
- `pyproject.toml` — Add `redis` dependency

### 2. Enhanced News Reactions (from `theasrk`)

Richer emoji reaction system with picker popover, per-emoji counts, compact mode,
and misinfo flag counts.

**Modified frontend files:**
- `ArticleReactions.tsx` — Replace with enhanced version (emoji picker, counts)
- `NewsCard.tsx` — Integrate reaction counts + flag counts
- `NewsView.tsx` — Enhanced reaction/flag state management
- `appContext.tsx` — Merge reaction/flag state
- `types.ts` — Add reaction-related type extensions

### 3. News Sort by Most Comments (new feature)

- `NewsView.tsx` — Add `"most_comments"` to SortMode
- `NewsFilterBar.tsx` — Add "Most Comments" option

### 4. Benefits + Roadmap Integration

The roadmap agent already covers benefits via `gov_services.json` which includes
benefits services. `CitizenMeta` includes income/household/disabilities for eligibility.
No separate benefits feature needed — the roadmap IS the benefits application guide.

## Branch Cleanup (post-integration)

Delete all 5 remote branches:
- `theasrk` — features integrated
- `integrate-services-roadmap` — features integrated
- `services_roadmap` — superseded by integrate branch
- `feat/kishore-notifications` — already merged
- `feature/anandh-ai-chatbot-predictive` — already merged
