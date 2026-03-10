# MontgomeryAI — Codebase Fixes Plan

> **Source:** `docs/codebase-review.md` Section 8 — Prioritized Fix List
> **Branch:** `news/sentiment`
> **Date:** 2026-03-07

---

## Task 1: Fix port bug in apiConfig.ts

**Priority:** Critical
**Agent:** frontend-architect

**Problem:** `apiConfig.ts` defaults `ANALYSIS_API_BASE` to `http://localhost:8001`, but the FastAPI server runs on port `8787`. Mayor chat fails with connection refused.

**Fix:** Change the admin chat store to use relative `/api/chat` path (goes through Vite proxy), and update `apiConfig.ts` default to `8787` as a safety net.

**Files:**
- `frontend/src/lib/apiConfig.ts` — change default port from `8001` to `8787`
- `frontend/src/stores/adminChatStore.ts` — use relative `/api/chat` instead of `${ANALYSIS_API_BASE}/api/chat`

**Verify:**
```
Run: cd frontend && npx tsc --noEmit
```

```
git commit -m "fix(frontend): correct API port default and use relative chat URL"
```

---

## Task 2: Fix stale imports in brightdata/test_sdk.py

**Priority:** Critical
**Agent:** backend-logic-architect

**Problem:** All imports reference `scripts.*` — a path removed in the refactor. Running this file crashes with `ModuleNotFoundError`.

**Fix:** Update imports from `scripts.bright_data_client` → `backend.core.bright_data_client` and `scripts.payloads` → `backend.core.payloads`.

**Files:**
- `brightdata/test_sdk.py` — update all `scripts.*` imports to `backend.core.*`

**Verify:**
```
Run: cd backend && python -c "import brightdata.test_sdk" || echo "check manually"
```

```
git commit -m "fix(brightdata): update stale imports to post-refactor paths"
```

---

## Task 3: Fix thread-safety in SSE broadcast_event

**Priority:** High
**Agent:** backend-logic-architect

**Problem:** `broadcast_event()` in `sse_broadcaster.py` is called from a `ThreadPoolExecutor` thread in `scrape_scheduler.py`. `asyncio.Queue.put_nowait()` is not thread-safe — race condition under load.

**Fix:** Use `loop.call_soon_threadsafe(queue.put_nowait, payload)` or make the broadcaster accept cross-thread calls safely.

**Files:**
- `backend/core/sse_broadcaster.py` — add thread-safe broadcast method using `call_soon_threadsafe`

**Verify:**
```
Run: python -c "from backend.core.sse_broadcaster import broadcast_event; print('OK')"
```

```
git commit -m "fix(core): make SSE broadcast_event thread-safe for cross-thread calls"
```

---

## Task 4: Add error handling to webhook handlers

**Priority:** High
**Agent:** api-agent

**Problem:** All three webhook endpoints (`/webhook/jobs`, `/webhook/news`, `/webhook/housing`) have zero try/except. Processor crashes return raw 500 tracebacks.

**Fix:** Wrap each handler body in try/except, return structured JSON error responses, log the exception.

**Files:**
- `backend/api/routers/webhooks.py` — add try/except with structured error responses to all 3 endpoints

**Verify:**
```
Run: python -c "from backend.api.routers.webhooks import router; print('OK')"
```

```
git commit -m "fix(api): add error handling to webhook endpoints"
```

---

## Task 5: Add python-dotenv to pyproject.toml

**Priority:** High
**Agent:** backend-logic-architect

**Problem:** `python-dotenv` is used in `mayor_chat.py` and elsewhere but not listed as a dependency. Works via `uv` implicit behavior but is fragile.

**Files:**
- `pyproject.toml` — add `python-dotenv` to dependencies

**Verify:**
```
Run: grep "python-dotenv" pyproject.toml
```

```
git commit -m "fix(deps): add python-dotenv as explicit dependency"
```

---

## Task 6: Wire up housing SSE handler in frontend

**Priority:** High
**Agent:** frontend-architect

**Problem:** Frontend receives housing SSE events but only logs them to console — no dispatch, no rendering.

**Fix:** Add a `MERGE_HOUSING_LISTINGS` action to the reducer and dispatch it from `useDataStream.ts` when housing events arrive.

**Files:**
- `frontend/src/lib/useDataStream.ts` — dispatch `MERGE_HOUSING_LISTINGS` instead of console.log
- `frontend/src/lib/appContext.tsx` — add `MERGE_HOUSING_LISTINGS` case to reducer (if not already present)
- `frontend/src/lib/types.ts` — add housing type if needed

**Verify:**
```
Run: cd frontend && npx tsc --noEmit
```

```
git commit -m "feat(frontend): wire up housing SSE events to reducer"
```

---

## Task 7: Split build_civic_services_geojson.py — extract data to JSON

**Priority:** Medium
**Agent:** backend-logic-architect

**Problem:** `build_civic_services_geojson.py` is 564 lines. The first 431 lines are a `SERVICES` list literal — pure static data.

**Fix:** Extract `SERVICES` to `backend/data/civic_services_raw.json`, load it from the script.

**Files:**
- `backend/data/civic_services_raw.json` — new file with extracted SERVICES data
- `backend/core/build_civic_services_geojson.py` — load from JSON, reduce to ~100 lines. Also fix stale output path `"scripts/civic_services.geojson"` → correct path.

**Verify:**
```
Run: python -c "from backend.core.build_civic_services_geojson import main; print('OK')"
```

```
git commit -m "refactor(core): extract civic services data to JSON, fix stale output path"
```

---

## Task 8: Add webhook payload validation with Pydantic

**Priority:** Medium
**Agent:** api-agent

**Problem:** Webhook endpoints parse raw JSON without schema validation. Malformed payloads cause unpredictable errors.

**Fix:** Create Pydantic models for incoming Bright Data payloads, validate in webhook handlers.

**Files:**
- `backend/api/schemas/webhook_schemas.py` — new Pydantic models for job, news, housing payloads
- `backend/api/routers/webhooks.py` — use Pydantic models for request validation

**Verify:**
```
Run: python -c "from backend.api.schemas.webhook_schemas import *; print('OK')"
```

```
git commit -m "feat(api): add Pydantic validation for webhook payloads"
```

---

## Task 9: Fix README stale path reference

**Priority:** Medium
**Agent:** sub-apollo

**Problem:** README line 19 references `backend/scrape_scheduler.py` — should be `backend/core/scrape_scheduler.py`.

**Files:**
- `README.md` — fix path reference

**Verify:**
```
Run: grep "scrape_scheduler" README.md
```

```
git commit -m "docs: fix stale scrape_scheduler path in README"
```

---

## Task 10: Cache mayor agent instance

**Priority:** Low
**Agent:** ai-agent

**Problem:** `build_mayor_agent()` is called on every chat request, reconstructing the LLM client and agent each time. Wasteful.

**Fix:** Cache the agent at module level (build once, reuse). Use a module-level singleton or `@lru_cache`.

**Files:**
- `backend/agents/mayor_chat.py` — cache the agent instance (singleton pattern)

**Verify:**
```
Run: python -c "from backend.agents.mayor_chat import build_mayor_agent; print('OK')"
```

```
git commit -m "perf(agents): cache mayor agent instance to avoid per-request rebuild"
```

---

## Agent Summary

| Task | What | Agent | Priority |
|------|------|-------|----------|
| 1 | Fix port bug in apiConfig.ts | frontend-architect | Critical |
| 2 | Fix stale imports in test_sdk.py | backend-logic-architect | Critical |
| 3 | Thread-safe SSE broadcast | backend-logic-architect | High |
| 4 | Webhook error handling | api-agent | High |
| 5 | Add python-dotenv dep | backend-logic-architect | High |
| 6 | Wire housing SSE handler | frontend-architect | High |
| 7 | Extract civic services data to JSON | backend-logic-architect | Medium |
| 8 | Webhook payload validation | api-agent | Medium |
| 9 | Fix README stale path | sub-apollo | Medium |
| 10 | Cache mayor agent | ai-agent | Low |
