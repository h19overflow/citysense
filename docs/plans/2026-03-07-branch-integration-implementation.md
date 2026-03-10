# Branch Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate features from 3 unmerged branches (services roadmap, enhanced news reactions, sort-by-comments) into the restructured main branch.

**Architecture:** Manual cherry-pick and adapt — read source code from branches, port into main's current component structure. No git merge/rebase. Backend additions are additive (new files). Frontend changes modify existing redesigned components.

**Tech Stack:** FastAPI, LangChain + Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`), Redis, React/TypeScript, Tailwind CSS

---

### Task 1: Add roadmap Pydantic schemas

**Files:**
- Create: `backend/api/schemas/roadmap_schemas.py`

**Step 1: Create the schemas file**

```python
"""Pydantic schemas for roadmap generation requests and responses."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model that accepts/returns camelCase JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


class RoadmapLocation(CamelModel):
    """Office details for an in-person step."""

    name: str
    address: str
    hours: str = ""
    phone: str | None = None


class RoadmapStep(CamelModel):
    """A single roadmap step returned to the frontend."""

    id: str
    step_number: int
    title: str
    action: str
    documents: list[str] = Field(default_factory=list)
    location: RoadmapLocation | None = None
    estimated_time: str
    pro_tip: str | None = None
    can_do_online: bool = False
    online_url: str | None = None


class PersonalizedRoadmap(CamelModel):
    """Full roadmap payload consumed by the frontend."""

    id: str
    service_id: str
    service_title: str
    service_category: str
    eligibility_note: str
    total_estimated_time: str
    steps: list[RoadmapStep]
    generated_at: str


class CitizenCivicData(CamelModel):
    """Subset of the citizen profile needed for roadmap personalization."""

    zip: str | None = None
    household_size: int | None = None
    income: float | None = None
    income_source: str | None = None
    housing_type: str | None = None
    monthly_rent: float | None = None
    has_vehicle: bool | None = None
    children: int | None = None
    children_ages: list[int] | None = None
    veteran_status: bool = False
    disability_status: bool = False
    citizenship_status: str | None = "citizen"
    needs_housing_help: bool = False
    needs_utility_help: bool = False
    neighborhood: str | None = None
    needs_childcare: bool = False
    needs_legal_help: bool = False
    health_insurance: str | None = None
    primary_transport: str | None = None


class CitizenMeta(CamelModel):
    """Citizen profile mirrored from the frontend contract."""

    id: str
    persona: str
    tagline: str
    avatar_initials: str | None = None
    avatar_color: str | None = None
    goals: list[str] = Field(default_factory=list)
    barriers: list[str] = Field(default_factory=list)
    civic_data: CitizenCivicData


class RoadmapRequest(CamelModel):
    """Request body for roadmap generation."""

    service_id: str = Field(min_length=1)
    citizen: CitizenMeta | None = None


class RoadmapStepDraft(CamelModel):
    """Structured LLM output for one roadmap step before IDs are assigned."""

    step_number: int
    title: str
    action: str
    documents: list[str] = Field(default_factory=list)
    location: RoadmapLocation | None = None
    estimated_time: str
    pro_tip: str | None = None
    can_do_online: bool = False
    online_url: str | None = None


class RoadmapDraft(CamelModel):
    """Structured LLM output for a service roadmap."""

    eligibility_note: str = ""
    total_estimated_time: str = "Varies"
    steps: list[RoadmapStepDraft] = Field(default_factory=list)
```

**Step 2: Verify imports**

Run: `cd backend && python -c "from backend.api.schemas.roadmap_schemas import RoadmapRequest, PersonalizedRoadmap, RoadmapDraft; print('OK')"`
Expected: `OK`

---

### Task 2: Add Redis cache client

**Files:**
- Create: `backend/core/redis_client.py`
- Modify: `pyproject.toml` (add `redis` dependency)

**Step 1: Create redis_client.py**

```python
"""Best-effort Redis cache for roadmap generation."""

import json
import logging
import os
from typing import Any

import redis

logger = logging.getLogger("redis_cache")


class RedisCache:
    """Singleton Redis client that fails open when Redis is unavailable."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._client = None
            cls._instance._init_client()
        return cls._instance

    def _init_client(self) -> None:
        url = os.environ.get("REDIS_URL")
        if not url:
            logger.info("REDIS_URL not set; roadmap caching disabled.")
            self._client = None
            return

        try:
            self._client = redis.from_url(url, decode_responses=True)
            self._client.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as exc:
            logger.warning("Failed to connect to Redis: %s", exc)
            self._client = None

    def is_available(self) -> bool:
        if not self._client:
            return False
        try:
            return bool(self._client.ping())
        except Exception:
            return False

    def fetch(self, key: str) -> dict[str, Any] | None:
        if not self.is_available():
            return None
        try:
            data = self._client.get(key)
            if data:
                return json.loads(data)
        except Exception as exc:
            logger.warning("Redis fetch failed for %s: %s", key, exc)
        return None

    def store(self, key: str, value: Any, ttl: int = 86400) -> None:
        if not self.is_available():
            return
        try:
            payload = value if isinstance(value, str) else json.dumps(value)
            self._client.setex(key, ttl, payload)
        except Exception as exc:
            logger.warning("Redis store failed for %s: %s", key, exc)

    def delete(self, key: str) -> None:
        if not self.is_available():
            return
        try:
            self._client.delete(key)
        except Exception as exc:
            logger.warning("Redis delete failed for %s: %s", key, exc)


cache = RedisCache()
```

**Step 2: Add redis to pyproject.toml**

In `pyproject.toml`, add `"redis>=5.0.0"` to the `dependencies` list.

**Step 3: Verify import**

Run: `cd backend && python -c "from backend.core.redis_client import cache; print('available:', cache.is_available())"`
Expected: `available: False` (no REDIS_URL set, which is fine — fails gracefully)

---

### Task 3: Add roadmap generation agent

**Files:**
- Create: `backend/agents/roadmap_agent.py`

**Step 1: Create roadmap_agent.py**

```python
"""Personalized civic-service roadmap generation agent."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from backend.agents.common.llm import build_llm
from backend.api.schemas.roadmap_schemas import (
    CitizenMeta,
    PersonalizedRoadmap,
    RoadmapDraft,
    RoadmapLocation,
    RoadmapStep,
)
from backend.config import PUBLIC_DATA
from backend.core.redis_client import cache

logger = logging.getLogger("roadmap_agent")
ROADMAP_CACHE_TTL = int(os.environ.get("ROADMAP_CACHE_TTL", "86400"))
_GOV_SERVICES_PATH = PUBLIC_DATA / "gov_services.json"

SYSTEM_PROMPT = """You are CivicPath, an expert civic navigator for Montgomery, Alabama.
Your job is to turn government service documentation into a clear roadmap a resident can follow.

Rules:
1. Use only facts provided in the official service documentation.
2. Write in plain English with concrete steps.
3. If documentation is incomplete, make the first step tell the resident to contact the provider to confirm details.
4. Never return an empty roadmap.
5. Keep titles short and action-oriented.
6. Mention Montgomery-specific office details when available."""


@lru_cache(maxsize=1)
def _load_services() -> dict[str, dict[str, Any]]:
    with open(_GOV_SERVICES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {service["id"]: service for service in data["services"]}


def _get_service(service_id: str) -> dict[str, Any]:
    services = _load_services()
    if service_id not in services:
        available = ", ".join(sorted(services.keys()))
        raise ValueError(f"Service '{service_id}' not found. Available: {available}")
    return services[service_id]


@lru_cache(maxsize=1)
def _build_chain():
    llm = build_llm(temperature=0.1, max_tokens=4096)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{prompt}"),
    ])
    return prompt | llm.with_structured_output(RoadmapDraft)


def _format_income_limits(limits: Any) -> list[str]:
    if isinstance(limits, dict):
        return [
            f"Household of {size}: ${amount:,.0f}/month"
            for size, amount in limits.items()
            if isinstance(amount, (int, float))
        ]
    if isinstance(limits, list):
        return [str(item) for item in limits if item]
    return []


def _format_guide_for_prompt(guide: dict[str, Any]) -> str:
    lines = [
        f"SERVICE: {guide['title']}",
        f"PROVIDER: {guide.get('provider') or 'N/A'}",
        f"DESCRIPTION: {guide.get('description') or 'N/A'}",
        f"ADDRESS: {guide.get('address') or 'N/A'}",
        f"PHONE: {guide.get('phone') or 'N/A'}",
        f"WEBSITE: {guide.get('url') or 'N/A'}",
        "",
        "ELIGIBILITY:",
    ]
    for item in guide.get("eligibility", []):
        lines.append(f"- {item}")
    lines.extend(["", "HOW TO APPLY:"])
    for idx, step in enumerate(guide.get("how_to_apply", []), start=1):
        lines.append(f"{idx}. {step}")
    lines.extend(["", "DOCUMENTS NEEDED:"])
    for doc in guide.get("documents_needed", []):
        lines.append(f"- {doc}")
    income_limits = _format_income_limits(guide.get("income_limits"))
    if income_limits:
        lines.extend(["", "INCOME LIMITS:"])
        for limit in income_limits:
            lines.append(f"- {limit}")
    return "\n".join(lines)


def _build_citizen_summary(citizen: CitizenMeta) -> str:
    civic = citizen.civic_data
    return "\n".join([
        f"Persona: {citizen.persona}",
        f"Tagline: {citizen.tagline}",
        f"Zip code: {civic.zip or 'Montgomery, AL'}",
        f"Household size: {civic.household_size or 'unknown'}",
        f"Monthly income: {civic.income if civic.income is not None else 'unknown'}",
        f"Income source: {civic.income_source or 'unknown'}",
        f"Housing type: {civic.housing_type or 'unknown'}",
        f"Monthly rent: {civic.monthly_rent if civic.monthly_rent is not None else 'unknown'}",
        f"Children: {civic.children if civic.children is not None else 0}",
        f"Children ages: {civic.children_ages or []}",
        f"Has vehicle: {civic.has_vehicle}",
        f"Primary transport: {civic.primary_transport or 'unknown'}",
        f"Veteran status: {civic.veteran_status}",
        f"Disability status: {civic.disability_status}",
        f"Citizenship status: {civic.citizenship_status or 'unknown'}",
        f"Health insurance: {civic.health_insurance or 'unknown'}",
        f"Goals: {'; '.join(citizen.goals[:2]) or 'none provided'}",
        f"Barriers: {'; '.join(citizen.barriers[:2]) or 'none provided'}",
    ])


def _build_prompt(citizen: CitizenMeta | None, guide: dict[str, Any]) -> str:
    guide_text = _format_guide_for_prompt(guide)
    if citizen is None:
        return (
            f"Convert this official service documentation into a practical step-by-step "
            f"roadmap for any Montgomery resident.\n\n"
            f"OFFICIAL SERVICE DOCUMENTATION\n{guide_text}\n\n"
            f"Requirements:\n"
            f"- Summarize who qualifies in eligibility_note.\n"
            f"- Provide a realistic total_estimated_time.\n"
            f"- Each step must explain what to do, which documents matter, whether it "
            f"can be done online, and where to go when in-person help is needed.\n"
            f"- If HOW TO APPLY is empty, begin with a contact-the-provider step "
            f"and then outline the safest next actions."
        )
    citizen_text = _build_citizen_summary(citizen)
    return (
        f"Transform this official service documentation into a personalized roadmap "
        f"for the resident below.\n\n"
        f"CITIZEN PROFILE\n{citizen_text}\n\n"
        f"OFFICIAL SERVICE DOCUMENTATION\n{guide_text}\n\n"
        f"Requirements:\n"
        f"- Explain why this resident appears eligible using their income, household, "
        f"housing, or other relevant profile details.\n"
        f"- Rewrite each step in plain English directly for this resident.\n"
        f"- Filter documents down to what matters most for that resident.\n"
        f"- If HOW TO APPLY is empty, begin with a contact-the-provider step "
        f"tailored to their situation."
    )


def _build_cache_key(service_id: str, citizen: CitizenMeta | None) -> str:
    if citizen is None:
        return f"roadmap:generic:{service_id}"
    citizen_hash = hashlib.md5(
        citizen.model_dump_json(by_alias=True).encode()
    ).hexdigest()
    return f"roadmap:personalized:{service_id}:{citizen_hash}"


def _build_fallback_steps(guide: dict[str, Any]) -> list[RoadmapStep]:
    address = guide.get("address")
    phone = guide.get("phone") or None
    location = None
    if address and address != "N/A — phone and web service":
        location = RoadmapLocation(
            name=guide.get("provider") or guide["title"],
            address=address,
            hours=str(guide.get("hours") or ""),
            phone=phone,
        )
    source_steps = guide.get("how_to_apply", [])
    if not source_steps:
        source_steps = [
            f"Contact {guide['title']} to confirm the latest eligibility rules and how to start.",
            "Gather your identification, income, and household documents before applying.",
            "Complete the application online or in person and track follow-up requests.",
        ]
    return [
        RoadmapStep(
            id=f"step-{idx}-{guide['id']}",
            step_number=idx,
            title=f"Step {idx}",
            action=action,
            documents=list(guide.get("documents_needed", []))[:4],
            location=location if idx == 1 else None,
            estimated_time="Varies",
            pro_tip=None,
            can_do_online=bool(guide.get("url")),
            online_url=guide.get("url"),
        )
        for idx, action in enumerate(source_steps, start=1)
    ]


def _build_roadmap_model(
    draft: RoadmapDraft,
    guide: dict[str, Any],
    citizen: CitizenMeta | None,
) -> PersonalizedRoadmap:
    draft_steps = draft.steps or []
    if not draft_steps:
        steps = _build_fallback_steps(guide)
    else:
        steps = [
            RoadmapStep(
                id=f"step-{idx}-{guide['id']}",
                step_number=step.step_number or idx,
                title=step.title or f"Step {idx}",
                action=step.action,
                documents=step.documents,
                location=step.location,
                estimated_time=step.estimated_time,
                pro_tip=step.pro_tip,
                can_do_online=step.can_do_online,
                online_url=step.online_url,
            )
            for idx, step in enumerate(draft_steps, start=1)
        ]
    citizen_id = citizen.id if citizen else "generic"
    now = datetime.now(timezone.utc).isoformat()
    return PersonalizedRoadmap(
        id=f"roadmap-{guide['id']}-{citizen_id}-{int(datetime.now(timezone.utc).timestamp())}",
        service_id=guide["id"],
        service_title=guide["title"],
        service_category=guide.get("category", ""),
        eligibility_note=draft.eligibility_note or "Review the official requirements before applying.",
        total_estimated_time=draft.total_estimated_time or "Varies",
        steps=steps,
        generated_at=now,
    )


def generate_personalized_roadmap(
    citizen: CitizenMeta | None,
    service_id: str,
) -> PersonalizedRoadmap:
    """Generate or fetch a cached civic-service roadmap."""
    cache_key = _build_cache_key(service_id, citizen)
    cached = cache.fetch(cache_key)
    if cached:
        try:
            logger.info("Roadmap cache hit for %s", cache_key)
            return PersonalizedRoadmap.model_validate(cached)
        except Exception as exc:
            logger.warning("Ignoring invalid cached roadmap for %s: %s", cache_key, exc)

    guide = _get_service(service_id)
    prompt = _build_prompt(citizen, guide)

    try:
        draft = _build_chain().invoke({"prompt": prompt})
    except Exception as exc:
        logger.error("Roadmap generation failed for %s: %s", service_id, exc)
        raise RuntimeError(f"Gemini generation failed: {exc}") from exc

    roadmap = _build_roadmap_model(draft, guide, citizen)

    try:
        cache.store(cache_key, roadmap.model_dump(by_alias=True), ttl=ROADMAP_CACHE_TTL)
    except Exception as exc:
        logger.warning("Roadmap cache write failed for %s: %s", cache_key, exc)

    return roadmap
```

**Step 2: Verify import**

Run: `cd backend && python -c "from backend.agents.roadmap_agent import generate_personalized_roadmap; print('OK')"`
Expected: `OK` (or a warning about GEMINI_API_KEY if not set, which is fine)

---

### Task 4: Add roadmap API router and register it

**Files:**
- Create: `backend/api/routers/roadmap.py`
- Modify: `backend/api/main.py:14,54` (add import + include_router)

**Step 1: Create the router**

```python
"""Roadmap generation endpoint."""

from fastapi import APIRouter, HTTPException

from backend.agents.roadmap_agent import generate_personalized_roadmap
from backend.api.schemas.roadmap_schemas import PersonalizedRoadmap, RoadmapRequest

router = APIRouter(tags=["roadmap"])


@router.post("/roadmap/generate", response_model=PersonalizedRoadmap)
def generate_roadmap(request: RoadmapRequest) -> PersonalizedRoadmap:
    """Generate a personalized or generic roadmap for a civic service."""
    try:
        return generate_personalized_roadmap(
            citizen=request.citizen,
            service_id=request.service_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Roadmap generation failed.") from exc
```

**Step 2: Register in main.py**

In `backend/api/main.py`:
- Add `roadmap` to the import on line 14: `from backend.api.routers import analysis, chat, citizen_chat, comments, stream, webhooks, roadmap`
- Add after line 56: `app.include_router(roadmap.router, prefix="/api")`

**Step 3: Verify the app boots**

Run: `cd backend && python -c "from backend.api.main import app; print('routes:', len(app.routes))"`
Expected: prints route count without errors

---

### Task 5: Add frontend roadmap types to types.ts

**Files:**
- Modify: `frontend/src/lib/types.ts`

**Step 1: Add roadmap types after the `PersonalizedRoadmap` definition area (before `AppState`)**

Add these types after the `CitizenMeta` interface (around line 270):

```typescript
/* ── Roadmap ──────────────────────────────────────────── */
export interface RoadmapLocation {
  name: string;
  address: string;
  hours?: string;
  phone?: string | null;
}

export interface RoadmapStep {
  id: string;
  stepNumber: number;
  title: string;
  action: string;
  documents: string[];
  location?: RoadmapLocation | null;
  estimatedTime: string;
  proTip?: string | null;
  canDoOnline: boolean;
  onlineUrl?: string | null;
}

export interface PersonalizedRoadmap {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory: string;
  eligibilityNote: string;
  totalEstimatedTime: string;
  steps: RoadmapStep[];
  generatedAt: string;
}
```

**Step 2: Add roadmap fields to AppState interface**

In the `AppState` interface, add after `housingListings`:

```typescript
  activeRoadmap: PersonalizedRoadmap | null;
  roadmapCompletedStepIds: string[];
```

**Step 3: Add `serviceId` and `serviceTitle` to `ChatMessage`**

In the `ChatMessage` interface, add:

```typescript
  serviceId?: string;
  serviceTitle?: string;
```

---

### Task 6: Add roadmap actions to appContext.tsx

**Files:**
- Modify: `frontend/src/lib/appContext.tsx`

**Step 1: Add imports**

Add `PersonalizedRoadmap` to the type imports from `./types`.

**Step 2: Add 3 new action types to the AppAction union**

Add after the `CLEAR_GUIDE_PENDING` action:

```typescript
  | { type: "SET_ACTIVE_ROADMAP"; roadmap: PersonalizedRoadmap }
  | { type: "CLEAR_ROADMAP" }
  | { type: "TOGGLE_ROADMAP_STEP"; stepId: string };
```

**Step 3: Add initial state fields**

In `initialState`, add:

```typescript
  activeRoadmap: null,
  roadmapCompletedStepIds: [],
```

**Step 4: Add reducer cases**

In the `appReducer` switch, add before `default`:

```typescript
    case "SET_ACTIVE_ROADMAP":
      return { ...state, activeRoadmap: action.roadmap, roadmapCompletedStepIds: [] };
    case "CLEAR_ROADMAP":
      return { ...state, activeRoadmap: null, roadmapCompletedStepIds: [] };
    case "TOGGLE_ROADMAP_STEP": {
      const stepId = action.stepId;
      const wasCompleted = state.roadmapCompletedStepIds.includes(stepId);
      return {
        ...state,
        roadmapCompletedStepIds: wasCompleted
          ? state.roadmapCompletedStepIds.filter((id) => id !== stepId)
          : [...state.roadmapCompletedStepIds, stepId],
      };
    }
```

---

### Task 7: Add ServiceRoadmapView component

**Files:**
- Create: `frontend/src/components/app/services/ServiceRoadmapView.tsx`

**Step 1: Create the component**

Copy the full `ServiceRoadmapView.tsx` from the branch source code (shown in exploration). The component uses `useApp()` to read `state.activeRoadmap` and `state.roadmapCompletedStepIds`, and dispatches `CLEAR_ROADMAP` and `TOGGLE_ROADMAP_STEP`.

No modifications needed — it imports from `@/lib/appContext` and `@/lib/types` which match main's structure.

---

### Task 8: Add ChatRoadmapCard component

**Files:**
- Create: `frontend/src/components/app/cards/ChatRoadmapCard.tsx`

**Step 1: Create the component**

Copy the full `ChatRoadmapCard.tsx` from the branch source code. It calls `POST /api/roadmap/generate` and dispatches `SET_ACTIVE_ROADMAP`.

No modifications needed — uses existing `useApp()`, `ChatMessage`, `PersonalizedRoadmap` types.

---

### Task 9: Add roadmap mode to ServicesView + GuideExpandedContent

**Files:**
- Modify: `frontend/src/components/app/services/ServicesView.tsx`
- Modify: `frontend/src/components/app/services/GuideExpandedContent.tsx`

**Step 1: Update ServicesView.tsx**

Change the `ServicesMode` type to include `"roadmap"`:

```typescript
type ServicesMode = "directory" | "map" | "detail" | "roadmap";
```

Add import for `ServiceRoadmapView`:

```typescript
import { ServiceRoadmapView } from "./ServiceRoadmapView";
```

Add a `useEffect` to auto-switch to roadmap mode when `activeRoadmap` is set:

```typescript
  useEffect(() => {
    if (state.activeRoadmap) {
      setMode("roadmap");
    }
  }, [state.activeRoadmap]);
```

Add the roadmap render case before the map check:

```typescript
  if (mode === "roadmap" && state.activeRoadmap) {
    return <ServiceRoadmapView />;
  }
```

**Step 2: Update GuideExpandedContent.tsx**

Replace the "Help Me Apply" button with a "Get Step-by-Step Guide" button that generates a roadmap. Add state for loading/error:

Add imports at top:

```typescript
import { useState } from "react";
import { Loader2, Route } from "lucide-react";
import { useApp } from "@/lib/appContext";
```

Inside the component, add:

```typescript
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateRoadmap() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { serviceId: guide.id };
      if (state.citizenMeta) body.citizen = state.citizenMeta;
      const response = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail ?? "Failed to generate roadmap");
      }
      const roadmap = await response.json();
      dispatch({ type: "SET_ACTIVE_ROADMAP", roadmap });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate roadmap");
    } finally {
      setLoading(false);
    }
  }
```

Replace the "Help Me Apply" button with:

```tsx
        <button
          onClick={handleGenerateRoadmap}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Building Guide...
            </>
          ) : (
            <>
              <Route className="w-3.5 h-3.5" />
              Get Step-by-Step Guide
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
```

---

### Task 10: Enhance ArticleReactions with emoji picker

**Files:**
- Modify: `frontend/src/components/app/news/ArticleReactions.tsx`

**Step 1: Replace the entire file with the enhanced version from theasrk**

The enhanced version adds:
- Emoji picker popover (click to open, click-outside to close)
- Per-emoji reaction counts
- Compact mode support
- Flag count display
- Toggle reactions (click same emoji to un-react)

New props interface:

```typescript
interface ArticleReactionsProps {
  articleId: string;
  reactionCounts: Record<string, number>;
  userReaction: string | null;
  flagCount: number;
  isFlagged: boolean;
  onReact: (articleId: string, emoji: string | null) => void;
  onFlag: (articleId: string) => void;
  compact?: boolean;
}
```

---

### Task 11: Update NewsCard to pass enhanced reaction props

**Files:**
- Modify: `frontend/src/components/app/news/NewsCard.tsx`

**Step 1: Update the NewsCardProps interface**

```typescript
interface NewsCardProps {
  article: NewsArticle;
  reactionCounts: Record<string, number>;
  userReaction: string | null;
  flagCount: number;
  isFlagged: boolean;
  onSelect: (article: NewsArticle) => void;
  onReact: (articleId: string, emoji: string | null) => void;
  onFlag: (articleId: string) => void;
}
```

**Step 2: Update the ArticleReactions usage in the footer**

Pass the new props:

```tsx
<ArticleReactions
  articleId={article.id}
  reactionCounts={reactionCounts}
  userReaction={userReaction}
  flagCount={flagCount}
  isFlagged={isFlagged}
  onReact={onReact}
  onFlag={onFlag}
  compact
/>
```

---

### Task 12: Update NewsView with enhanced reactions + sort by comments

**Files:**
- Modify: `frontend/src/components/app/news/NewsView.tsx`
- Modify: `frontend/src/components/app/news/NewsFilterBar.tsx`

**Step 1: Add `"most_comments"` to SortMode in NewsView**

```typescript
type SortMode = "newest" | "oldest" | "most_liked" | "most_comments";
```

**Step 2: Update the `sortArticles` function**

```typescript
function sortArticles(articles: NewsArticle[], sortMode: SortMode): NewsArticle[] {
  if (sortMode === "most_liked") {
    return [...articles].sort((a, b) => b.upvotes - a.upvotes);
  }
  if (sortMode === "most_comments") {
    return [...articles].sort((a, b) => b.commentCount - a.commentCount);
  }
  const sorted = sortArticlesByDate(articles);
  return sortMode === "oldest" ? sorted.reverse() : sorted;
}
```

**Step 3: Add reaction/flag handlers**

Add these handlers in the `NewsView` component:

```typescript
  function handleReact(articleId: string, emoji: string | null) {
    if (emoji === null) {
      // Clear reaction — for now just toggle the existing one
      const current = state.articleReactions[articleId];
      if (current) dispatch({ type: "SET_EMOJI_REACTION", articleId, emoji: current });
    } else {
      dispatch({ type: "SET_EMOJI_REACTION", articleId, emoji });
    }
  }

  function handleFlag(articleId: string) {
    dispatch({ type: "TOGGLE_ARTICLE_FLAG", articleId });
  }
```

**Step 4: Update NewsCard rendering to pass new props**

```tsx
<NewsCard
  key={article.id}
  article={article}
  reactionCounts={article.reactionCounts ?? {}}
  userReaction={state.articleReactions[article.id] ?? null}
  flagCount={article.flagCount ?? 0}
  isFlagged={state.flaggedArticleIds.includes(article.id)}
  onSelect={handleSelectArticle}
  onReact={handleReact}
  onFlag={handleFlag}
/>
```

**Step 5: Update NewsFilterBar sort options**

In `NewsFilterBar.tsx`, add to `SORT_OPTIONS`:

```typescript
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most_liked", label: "Popular" },
  { key: "most_comments", label: "Most Discussed" },
];
```

Update the `SortMode` type:

```typescript
type SortMode = "newest" | "oldest" | "most_liked" | "most_comments";
```

---

### Task 13: Verify frontend builds

**Step 1: Run the build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 2: Fix any type errors**

If there are type mismatches, fix them.

---

### Task 14: Delete stale remote branches

**Step 1: Delete all 5 remote branches**

Run (with user confirmation):
```bash
git push origin --delete theasrk
git push origin --delete integrate-services-roadmap
git push origin --delete services_roadmap
git push origin --delete feat/kishore-notifications
git push origin --delete feature/anandh-ai-chatbot-predictive
```

**Step 2: Clean up local tracking refs**

Run: `git fetch --prune`

---

### Task 15: Commit all changes

Stage all new and modified files and commit with message:

```
feat: integrate services roadmap and enhanced news reactions

- Add personalized civic-service roadmap generator (Gemini 2.0 Flash)
- Add Redis caching for roadmap generation (optional, fails gracefully)
- Add ServiceRoadmapView with step-by-step progress tracking
- Add "Get Step-by-Step Guide" button to service detail view
- Enhance ArticleReactions with emoji picker popover and counts
- Add "Most Discussed" sort option for news articles
- Cherry-picked from: integrate-services-roadmap, theasrk branches
```
