# Fix All Validation Issues — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix every issue identified in the Validation Report — documentation inaccuracies, 31+ file length violations, security gaps, performance problems, and zero test coverage.

**Architecture:** Split oversized files using domain extraction (types), reducer slices (state), component decomposition (UI), and module splitting (backend). Add security layers (ErrorBoundary, webhook auth, exception hierarchy). Add code splitting and memoization for performance. Add unit tests for critical business logic.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, shadcn/ui (frontend) | FastAPI, Python, LangGraph, Bright Data SDK (backend) | Vitest (frontend tests) | pytest (backend tests)

---

## Execution Order & Dependencies

```
Phase 1: Documentation (no code risk, unblocks nothing)
Phase 2: Frontend types.ts split (MUST be first — everything imports from it)
Phase 3: Frontend appContext.tsx split (second — all components use it)
Phase 4: Frontend component splits (independent — parallelizable)
Phase 5: Frontend data/helper splits (independent — parallelizable)
Phase 6: Backend file splits (independent of frontend)
Phase 7: Security fixes (frontend + backend)
Phase 8: Performance fixes (depends on Phase 2-5 being done)
Phase 9: Testing (depends on all splits being done)
```

---

## Phase 1: Documentation Fixes

### Task 1: Update CLAUDE.md to match reality

**Files:**
- Modify: `docs/CLAUDE.md`

**Step 1: Fix the tabs table**

Replace the "Current Tabs (4 live)" table with:

```markdown
### Current Tabs (4 live)

| Tab | View Key | Purpose | Key Components |
|-----|----------|---------|----------------|
| **Services** | `services` | Interactive map + directory of 8 service categories with ArcGIS data | `ServicesView.tsx`, `ServiceDirectory.tsx`, `ServiceMapView.tsx`, `ServiceGuideCards.tsx` |
| **News** | `news` | Community news feed with reactions, comments, sentiment, and newsletter | `NewsView.tsx`, `NewsCard.tsx`, `NewsDetail.tsx`, `CommentFeed.tsx` |
| **Admin** | `admin` | Admin dashboard — AI insights, comment analysis, mayor's brief, citizen view | `AdminDashboard.tsx`, `AIInsightsCard.tsx`, `MayorsBrief.tsx`, `CommentFeed.tsx` |
| **Profile** | `profile` | Citizen persona dashboard — civic snapshot, benefits, settings | `ProfileView.tsx`, `PersonaSelector.tsx` |
```

**Step 2: Fix the state management section**

Replace `state.activeView` line:
```markdown
- `state.activeView` controls which tab renders (`"cv" | "services" | "profile" | "admin" | "news"`)
```

**Step 3: Fix the ArcGIS claim**

Replace "31 public endpoints" with:
```markdown
1. **ArcGIS REST API** — 8 public service layers for Montgomery city data (health, community, childcare, education, safety, libraries, parks, police). Client in `arcgisService.ts`.
```

**Step 4: Clarify Bright Data description**

Replace with:
```markdown
2. **Bright Data** — Backend data pipeline for jobs (Indeed, LinkedIn, Glassdoor), government sites (Medicaid, DHR), and news via Web Scraper API, SERP API, and Web Unlocker. Scheduler runs every 15 min; results saved to `public/data/` and broadcast via SSE. See `docs/bright-data-integration.md`.
```

**Step 5: Build to verify no impact**

Run: `cd frontend && npm run build`
Expected: SUCCESS (docs change only)

**Step 6: Commit**
```
docs: update CLAUDE.md to match actual tab structure and data pillar descriptions
```

---

## Phase 2: Frontend Core Splits (Sequential — High Dependency)

### Task 2: Split types.ts into domain modules

**Files:**
- Modify: `frontend/src/lib/types.ts` (501 lines → barrel re-export ~30 lines)
- Create: `frontend/src/lib/types/common.ts`
- Create: `frontend/src/lib/types/profile.ts`
- Create: `frontend/src/lib/types/chat.ts`
- Create: `frontend/src/lib/types/jobs.ts`
- Create: `frontend/src/lib/types/services.ts`
- Create: `frontend/src/lib/types/news.ts`
- Create: `frontend/src/lib/types/housing.ts`
- Create: `frontend/src/lib/types/cv.ts`
- Create: `frontend/src/lib/types/roadmap.ts`
- Create: `frontend/src/lib/types/map.ts`
- Create: `frontend/src/lib/types/index.ts`

**Step 1: Read types.ts and categorize every type by domain**

Read: `frontend/src/lib/types.ts`

**Step 2: Create domain type files**

Each file gets its domain types. Example:
```typescript
// types/common.ts
export type Language = "en" | "es" | "ar";
export type AppView = "cv" | "services" | "profile" | "admin" | "news";
// ... other shared types
```

**Step 3: Create barrel re-export in types/index.ts**

```typescript
export * from "./common";
export * from "./profile";
export * from "./chat";
export * from "./jobs";
export * from "./services";
export * from "./news";
export * from "./housing";
export * from "./cv";
export * from "./roadmap";
export * from "./map";
```

**Step 4: Replace types.ts with re-export**

```typescript
// types.ts — backward compatibility
export * from "./types/index";
```

**Step 5: Build to verify**

Run: `cd frontend && npm run build`
Expected: SUCCESS — all existing imports from `./types` or `@/lib/types` still work.

**Step 6: Commit**
```
refactor(frontend): split types.ts into domain-specific type modules
```

---

### Task 3: Split appContext.tsx into reducer slices

**Files:**
- Modify: `frontend/src/lib/appContext.tsx` (391 lines → ~60 lines)
- Create: `frontend/src/lib/context/types.ts` (~90 lines — AppAction union, AppState)
- Create: `frontend/src/lib/context/initialState.ts` (~50 lines)
- Create: `frontend/src/lib/context/reducer.ts` (~60 lines — compose slices)
- Create: `frontend/src/lib/context/slices/chatSlice.ts` (~40 lines)
- Create: `frontend/src/lib/context/slices/jobsSlice.ts` (~40 lines)
- Create: `frontend/src/lib/context/slices/newsSlice.ts` (~50 lines)
- Create: `frontend/src/lib/context/slices/servicesSlice.ts` (~40 lines)
- Create: `frontend/src/lib/context/slices/uiSlice.ts` (~40 lines)
- Create: `frontend/src/lib/context/slices/cvSlice.ts` (~30 lines)

**Step 1: Read appContext.tsx and map all actions to slices**

Read: `frontend/src/lib/appContext.tsx`

**Step 2: Create context/types.ts with AppState + AppAction**

Extract the AppState interface and AppAction union type.

**Step 3: Create context/initialState.ts**

Extract the `initialState` constant.

**Step 4: Create each slice file**

Each slice handles its subset of actions:
```typescript
// context/slices/chatSlice.ts
import type { AppState, AppAction } from "../types";

export function chatReducer(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "ADD_MESSAGE": return { ...state, messages: [...state.messages, action.message] };
    case "SET_TYPING": return { ...state, isTyping: action.isTyping };
    // ... other chat actions
    default: return null; // not handled by this slice
  }
}
```

**Step 5: Create context/reducer.ts — compose all slices**

```typescript
import { chatReducer } from "./slices/chatSlice";
import { jobsReducer } from "./slices/jobsSlice";
// ...

const slices = [chatReducer, jobsReducer, newsReducer, servicesReducer, uiReducer, cvReducer];

export function appReducer(state: AppState, action: AppAction): AppState {
  for (const slice of slices) {
    const result = slice(state, action);
    if (result !== null) return result;
  }
  return state;
}
```

**Step 6: Simplify appContext.tsx to provider + hook only**

```typescript
import { appReducer } from "./context/reducer";
import { initialState } from "./context/initialState";
// Provider + useApp hook only (~60 lines)
```

**Step 7: Build to verify**

Run: `cd frontend && npm run build`
Expected: SUCCESS

**Step 8: Commit**
```
refactor(frontend): split appContext into reducer slices pattern
```

---

## Phase 3: Frontend Component Splits (Parallelizable)

### Task 4: Split CommutePanel.tsx (334 → 3-4 files)

**Files:**
- Modify: `frontend/src/components/app/cv/CommutePanel.tsx` (→ ~80 lines)
- Create: `frontend/src/components/app/cv/commute/CommuteMap.tsx` (~100 lines)
- Create: `frontend/src/components/app/cv/commute/CommuteCard.tsx` (~50 lines)
- Create: `frontend/src/components/app/cv/commute/useCommuteEstimates.ts` (~50 lines)

**Steps:**
1. Read CommutePanel.tsx
2. Extract map rendering to CommuteMap.tsx
3. Extract CommuteCard + TravelMode to CommuteCard.tsx
4. Extract useEffect hooks to useCommuteEstimates.ts custom hook
5. Simplify CommutePanel.tsx to orchestrator
6. Build to verify
7. Commit: `refactor(frontend): split CommutePanel into map, card, and hook modules`

---

### Task 5: Split UpskillingPanel.tsx (270 → 4 files)

**Files:**
- Modify: `frontend/src/components/app/cv/UpskillingPanel.tsx` (→ ~30 lines)
- Create: `frontend/src/components/app/cv/upskilling/ImpactHeader.tsx` (~40 lines)
- Create: `frontend/src/components/app/cv/upskilling/QuickWinsSection.tsx` (~30 lines)
- Create: `frontend/src/components/app/cv/upskilling/SkillPathCard.tsx` (~80 lines)
- Create: `frontend/src/components/app/cv/upskilling/upskillingHelpers.ts` (~15 lines)

**Steps:**
1. Read UpskillingPanel.tsx
2. Extract sub-components to individual files
3. Extract formatDuration to helpers
4. Simplify UpskillingPanel.tsx to composition
5. Build to verify
6. Commit: `refactor(frontend): split UpskillingPanel into sub-components`

---

### Task 6: Split ServiceGuideChat.tsx (262 → 4 files)

**Files:**
- Modify: `frontend/src/components/app/services/ServiceGuideChat.tsx` (→ ~100 lines)
- Create: `frontend/src/components/app/services/guide/GuideBubble.tsx` (~65 lines)
- Create: `frontend/src/components/app/services/guide/TypingDots.tsx` (~15 lines)
- Create: `frontend/src/components/app/services/guide/useGuideMessages.ts` (~50 lines)

**Steps:**
1. Read ServiceGuideChat.tsx
2. Extract GuideBubble, TypingDots to own files
3. Extract useEffect message logic to useGuideMessages hook
4. Build to verify
5. Commit: `refactor(frontend): split ServiceGuideChat into sub-components and hook`

---

### Task 7: Split CommentFeed.tsx (262 → 4 files)

**Files:**
- Modify: `frontend/src/components/app/admin/CommentFeed.tsx` (→ ~80 lines)
- Create: `frontend/src/components/app/admin/comments/CommentRow.tsx` (~40 lines)
- Create: `frontend/src/components/app/admin/comments/CollapsibleGroup.tsx` (~35 lines)
- Create: `frontend/src/components/app/admin/comments/commentFeedHelpers.ts` (~50 lines)

**Steps:**
1. Read CommentFeed.tsx
2. Extract CommentRow, CollapsibleGroup, GroupedByStory, GroupedByArea
3. Extract sort/group functions to helpers
4. Build to verify
5. Commit: `refactor(frontend): split CommentFeed into sub-components`

---

### Task 8: Split PersonaSelector.tsx (236 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/PersonaSelector.tsx` (→ ~60 lines)
- Create: `frontend/src/components/app/personas/PersonaCard.tsx` (~55 lines)
- Create: `frontend/src/components/app/personas/PersonaDetail.tsx` (~100 lines)

**Steps:**
1. Read PersonaSelector.tsx
2. Extract PersonaCard, PersonaDetail, DetailStat
3. Build to verify
4. Commit: `refactor(frontend): split PersonaSelector into sub-components`

---

### Task 9: Split MarketPulse.tsx (234 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/cv/MarketPulse.tsx` (→ ~100 lines)
- Create: `frontend/src/components/app/cv/market/MetricCard.tsx` (~20 lines)
- Create: `frontend/src/components/app/cv/market/HorizontalBarRow.tsx` (~20 lines)
- Create: `frontend/src/components/app/cv/market/marketPulseHelpers.ts` (~70 lines)

**Steps:**
1. Read MarketPulse.tsx
2. Extract computation helpers (countByField, computeTopSector, etc.)
3. Extract MetricCard, HorizontalBarRow
4. Build to verify
5. Commit: `refactor(frontend): split MarketPulse into helpers and sub-components`

---

### Task 10: Split NewsView.tsx (232 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/news/NewsView.tsx` (→ ~120 lines)
- Create: `frontend/src/components/app/news/newsViewHelpers.ts` (~50 lines)
- Create: `frontend/src/components/app/news/useArticleFiltering.ts` (~60 lines)

**Steps:**
1. Read NewsView.tsx
2. Extract filter functions (filterBySearch, filterBySource, filterBySentiment) to helpers
3. Extract filter state management to useArticleFiltering hook
4. Build to verify
5. Commit: `refactor(frontend): extract NewsView filter logic into helpers and hook`

---

### Task 11: Split JobMatchCard.tsx (231 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/cv/JobMatchCard.tsx` (→ ~100 lines)
- Create: `frontend/src/components/app/cv/job-match/JobMatchCardExpanded.tsx` (~90 lines)
- Create: `frontend/src/components/app/cv/job-match/jobMatchHelpers.ts` (~20 lines)

**Steps:**
1. Read JobMatchCard.tsx
2. Extract expanded detail section to JobMatchCardExpanded
3. Extract matchColor, formatTimeAgo to helpers
4. Build to verify
5. Commit: `refactor(frontend): split JobMatchCard expanded section`

---

### Task 12: Split JobFilters.tsx (228 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/cv/JobFilters.tsx` (→ ~120 lines)
- Create: `frontend/src/components/app/cv/filters/FilterPanel.tsx` (~70 lines)
- Create: `frontend/src/components/app/cv/filters/jobFilterHelpers.ts` (~20 lines)

**Steps:**
1. Read JobFilters.tsx
2. Extract expanded filter panel to FilterPanel
3. Extract createDefaultFilters, countActiveFilters to helpers
4. Build to verify
5. Commit: `refactor(frontend): split JobFilters panel into separate module`

---

### Task 13: Split ServiceMapView.tsx (221 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/services/ServiceMapView.tsx` (→ ~80 lines)
- Create: `frontend/src/components/app/services/map/ServiceMapDetail.tsx` (~40 lines)
- Create: `frontend/src/components/app/services/map/useMapCommands.ts` (~40 lines)

**Steps:**
1. Read ServiceMapView.tsx
2. Extract MapCommandHandler to useMapCommands hook
3. Extract selected point detail panel to ServiceMapDetail
4. Build to verify
5. Commit: `refactor(frontend): split ServiceMapView into hook and detail panel`

---

### Task 14: Split ServiceDirectoryParts.tsx (220 → barrel + 4 files)

**Files:**
- Modify: `frontend/src/components/app/services/ServiceDirectoryParts.tsx` (→ barrel re-export ~15 lines)
- Create: `frontend/src/components/app/services/directory/MiniMapPreview.tsx` (~56 lines)
- Create: `frontend/src/components/app/services/directory/DirectoryHero.tsx` (~35 lines)
- Create: `frontend/src/components/app/services/directory/CategoryCard.tsx` (~48 lines)
- Create: `frontend/src/components/app/services/directory/HelpPromptCard.tsx` (~26 lines)

**Steps:**
1. Read ServiceDirectoryParts.tsx
2. Extract each component to own file
3. Convert ServiceDirectoryParts.tsx to barrel re-export for backward compat
4. Build to verify
5. Commit: `refactor(frontend): split ServiceDirectoryParts into individual components`

---

### Task 15: Split AIInsightsCard.tsx (215 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/admin/AIInsightsCard.tsx` (→ ~80 lines)
- Create: `frontend/src/components/app/admin/insights/deduplication.ts` (~60 lines)
- Create: `frontend/src/components/app/admin/insights/analysisHelpers.ts` (~50 lines)

**Steps:**
1. Read AIInsightsCard.tsx
2. Extract deduplicateAndRank + tokenization to deduplication.ts
3. Extract fetchAnalysisResults + aggregateInsights to analysisHelpers.ts
4. Build to verify
5. Commit: `refactor(frontend): extract AIInsightsCard algorithm logic`

---

### Task 16: Split JobMatchPanel.tsx (212 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/cv/JobMatchPanel.tsx` (→ ~100 lines)
- Create: `frontend/src/components/app/cv/job-match/useJobFiltering.ts` (~80 lines)
- Create: `frontend/src/components/app/cv/job-match/JobResultsList.tsx` (~50 lines)

**Steps:**
1. Read JobMatchPanel.tsx
2. Extract complex useMemo filtering to useJobFiltering hook
3. Extract results rendering to JobResultsList
4. Build to verify
5. Commit: `refactor(frontend): extract JobMatchPanel filtering hook`

---

### Task 17: Split FloatingChatBubble.tsx (203 → 3 files)

**Files:**
- Modify: `frontend/src/components/app/FloatingChatBubble.tsx` (→ ~60 lines)
- Create: `frontend/src/components/app/chat-bubble/CollapsedBubble.tsx` (~57 lines)
- Create: `frontend/src/components/app/chat-bubble/ExpandedPanel.tsx` (~50 lines)

**Steps:**
1. Read FloatingChatBubble.tsx
2. Extract CollapsedBubble and ExpandedPanel to own files
3. Build to verify
4. Commit: `refactor(frontend): split FloatingChatBubble into collapsed and expanded`

---

## Phase 4: Frontend Data/Helper Splits (Parallelizable)

### Task 18: Split demoResponses.ts (268 → response factory)

**Files:**
- Modify: `frontend/src/lib/demoResponses.ts` (→ ~50 lines router)
- Create: `frontend/src/lib/demoResponses/benefitsResponses.ts` (~40 lines)
- Create: `frontend/src/lib/demoResponses/careerResponses.ts` (~40 lines)
- Create: `frontend/src/lib/demoResponses/housingResponses.ts` (~40 lines)
- Create: `frontend/src/lib/demoResponses/communityResponses.ts` (~40 lines)
- Create: `frontend/src/lib/demoResponses/defaultResponse.ts` (~30 lines)

**Steps:**
1. Read demoResponses.ts
2. Group responses by domain
3. Create domain response files
4. Convert demoResponses.ts to router
5. Build to verify
6. Commit: `refactor(frontend): split demoResponses into domain-specific modules`

---

### Task 19: Split mockJobData.ts (267 → by industry)

**Files:**
- Modify: `frontend/src/lib/mockJobData.ts` (→ ~30 lines composer)
- Create: `frontend/src/lib/mockJobData/healthcareJobs.ts` (~40 lines)
- Create: `frontend/src/lib/mockJobData/manufacturingJobs.ts` (~40 lines)
- Create: `frontend/src/lib/mockJobData/retailJobs.ts` (~40 lines)
- Create: `frontend/src/lib/mockJobData/transportJobs.ts` (~30 lines)
- Create: `frontend/src/lib/mockJobData/officeJobs.ts` (~40 lines)

**Steps:**
1. Read mockJobData.ts
2. Group jobs by industry
3. Create industry files
4. Convert mockJobData.ts to composer
5. Build to verify
6. Commit: `refactor(frontend): split mockJobData by industry`

---

### Task 20: Split remaining borderline files

**Files to split (UploadZone 188, jobMatcher 188, ProfileView 161):**
- Extract `frontend/src/components/app/cv/upload/AnalysisProgress.tsx` from UploadZone
- Extract `frontend/src/lib/jobMatcherHelpers.ts` from jobMatcher
- Extract `frontend/src/components/app/profile/SettingsSection.tsx` from ProfileView

**Steps:**
1. Read each file
2. Extract the most logical piece to get under 150 lines
3. Build to verify
4. Commit: `refactor(frontend): split UploadZone, jobMatcher, and ProfileView to comply with 150-line limit`

---

## Phase 5: Backend File Splits

### Task 21: Split responder.py (985 → 3 files)

**Files:**
- Modify: `backend/chatbot/responder.py` (→ ~150 lines)
- Create: `backend/chatbot/answer_templates.py` (~300 lines)
- Create: `backend/chatbot/followup_handlers.py` (~200 lines)

**Steps:**
1. Read responder.py
2. Move all `_answer_*` functions to answer_templates.py
3. Move all `_handle_*_followup` functions to followup_handlers.py
4. Import and call from responder.py
5. Verify: `python -c "from chatbot.responder import handle_chat"`
6. Commit: `refactor(backend): split responder.py into answer templates and followup handlers`

---

### Task 22: Split retrieval.py (685 → 4 files)

**Files:**
- Modify: `backend/chatbot/retrieval.py` (→ ~80 lines)
- Create: `backend/chatbot/retrieval_services.py` (~150 lines)
- Create: `backend/chatbot/retrieval_events.py` (~150 lines)
- Create: `backend/chatbot/retrieval_safety.py` (~120 lines)

**Steps:**
1. Read retrieval.py
2. Move service retrievers to retrieval_services.py
3. Move event/traffic/new_resident retrievers to retrieval_events.py
4. Move safety/trending/job_loss retrievers to retrieval_safety.py
5. Keep retrieve_context dispatcher in retrieval.py
6. Verify: `python -c "from chatbot.retrieval import retrieve_context"`
7. Commit: `refactor(backend): split retrieval.py into domain-specific retrievers`

---

### Task 23: Split remaining backend files

**Files:**
- Extract `backend/chatbot/context_constants.py` from context_memory.py
- Extract `backend/processors/geocoding_constants.py` from geocode_news.py
- Extract `backend/predictive/hotspot_config.py` from hotspot_scorer.py
- Extract `backend/processors/scrape_orchestrators.py` from scrape_scheduler.py
- Minor extractions in process_jobs.py

**Steps:**
1. Read each file
2. Extract constants/config to dedicated files
3. Verify imports
4. Commit: `refactor(backend): extract constants and config from oversized modules`

---

### Task 24: Add backend error handling infrastructure

**Files:**
- Create: `backend/core/exceptions.py` (~50 lines)
- Modify: `backend/api/main.py` (add global exception handler)
- Modify: `backend/api/routers/webhooks.py` (replace bare except)

**Steps:**
1. Create exception hierarchy:
```python
class AppException(Exception):
    def __init__(self, code: str, message: str, details: dict | None = None, status_code: int = 500): ...

class ValidationError(AppException): ...
class NotFoundError(AppException): ...
class ExternalServiceError(AppException): ...
```
2. Add global handler to FastAPI:
```python
@app.exception_handler(AppException)
async def handle_app_exception(request, exc): ...
```
3. Replace bare `except Exception:` blocks with specific catches
4. Verify: `python -c "from core.exceptions import AppException"`
5. Commit: `feat(backend): add exception hierarchy and global error handler`

---

## Phase 6: Security Fixes

### Task 25: Add React ErrorBoundary

**Files:**
- Create: `frontend/src/components/ErrorBoundary.tsx` (~50 lines)
- Modify: `frontend/src/App.tsx` (wrap routes)

**Steps:**
1. Create ErrorBoundary class component with fallback UI
2. Wrap `<Routes>` in App.tsx with `<ErrorBoundary>`
3. Build to verify
4. Commit: `feat(frontend): add React ErrorBoundary for graceful error recovery`

---

### Task 26: Fix dangerouslySetInnerHTML XSS risk

**Files:**
- Modify: `frontend/src/components/app/services/ServiceGuideChat.tsx`

**Steps:**
1. Read the file to find dangerouslySetInnerHTML usage
2. Replace with safe rendering (React elements or DOMPurify)
3. Build to verify
4. Commit: `fix(frontend): sanitize dangerouslySetInnerHTML usage`

---

### Task 27: Fix Gemini API key exposure

**Files:**
- Modify: `frontend/src/lib/misinfo/geminiAnalyzer.ts`

**Steps:**
1. Read geminiAnalyzer.ts
2. Remove localStorage fallback for API key
3. Only use VITE_GEMINI_API_KEY from env (acceptable for client-side Gemini)
4. Add warning comment about key exposure
5. Build to verify
6. Commit: `fix(frontend): remove localStorage API key storage in geminiAnalyzer`

---

### Task 28: Add webhook authentication

**Files:**
- Modify: `backend/api/routers/webhooks.py`
- Modify: `backend/config.py` (add WEBHOOK_SECRET)

**Steps:**
1. Add `WEBHOOK_SECRET` env var to config
2. Create `verify_webhook_signature` dependency
3. Add dependency to all webhook routes
4. Verify: Test with curl
5. Commit: `feat(backend): add Bearer token authentication to webhook endpoints`

---

## Phase 7: Performance Fixes

### Task 29: Add code splitting with React.lazy

**Files:**
- Modify: `frontend/src/App.tsx`

**Steps:**
1. Read App.tsx
2. Replace static imports with React.lazy for heavy pages:
```typescript
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MayorChat = lazy(() => import("./pages/MayorChat"));
```
3. Wrap routes with `<Suspense fallback={<LoadingSpinner />}>`
4. Build to verify — chunk size warning should improve
5. Commit: `perf(frontend): add code splitting with React.lazy for route pages`

---

### Task 30: Enable stricter TypeScript

**Files:**
- Modify: `frontend/tsconfig.json`

**Steps:**
1. Set `"strictNullChecks": true`
2. Set `"noImplicitAny": true`
3. Run build — fix any type errors that surface
4. Commit: `chore(frontend): enable strictNullChecks and noImplicitAny`

**Note:** This may produce many type errors. Fix incrementally — add explicit types and null checks where needed. This task may take longer than others.

---

### Task 31: Add abort signals to ArcGIS fetches

**Files:**
- Modify: `frontend/src/lib/arcgisService.ts`

**Steps:**
1. Read arcgisService.ts
2. Add AbortController with 10s timeout to fetch calls:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeout);
```
3. Build to verify
4. Commit: `perf(frontend): add abort signals with timeout to ArcGIS fetches`

---

### Task 32: Add memoization to heavy components

**Files:**
- Modify: `frontend/src/components/app/cv/JobMatchPanel.tsx`
- Modify: `frontend/src/components/app/news/NewsView.tsx`
- Modify: `frontend/src/components/app/cv/CommutePanel.tsx`

**Steps:**
1. Add useCallback to event handlers
2. Add useMemo to computed/filtered lists
3. Wrap child components with React.memo where beneficial
4. Build to verify
5. Commit: `perf(frontend): add memoization to JobMatchPanel, NewsView, and CommutePanel`

---

## Phase 8: Testing

### Task 33: Add frontend unit tests for jobMatcher

**Files:**
- Create: `frontend/src/lib/__tests__/jobMatcher.test.ts`

**Steps:**
1. Write tests for: matchJobsToProfile, computeTrendingSkills
2. Cover: positive (matching skills), negative (no match), edge (empty CV)
3. Run: `cd frontend && npx vitest run src/lib/__tests__/jobMatcher.test.ts`
4. Commit: `test(frontend): add unit tests for jobMatcher`

---

### Task 34: Add frontend unit tests for appContext reducer

**Files:**
- Create: `frontend/src/lib/context/__tests__/reducer.test.ts`

**Steps:**
1. Write tests for key actions: ADD_MESSAGE, SET_JOB_LISTINGS, SET_ACTIVE_VIEW
2. Cover: state transitions, edge cases
3. Run: `cd frontend && npx vitest run`
4. Commit: `test(frontend): add unit tests for appContext reducer`

---

### Task 35: Add frontend unit tests for arcgisService

**Files:**
- Create: `frontend/src/lib/__tests__/arcgisService.test.ts`

**Steps:**
1. Mock fetch globally
2. Test: fetchServicePoints returns correct ServicePoint shape
3. Test: caching works (second call doesn't fetch)
4. Test: error handling (fetch failure returns empty array)
5. Run: `cd frontend && npx vitest run`
6. Commit: `test(frontend): add unit tests for arcgisService`

---

### Task 36: Add backend pytest configuration and tests

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_bright_data_client.py`
- Create: `backend/tests/test_webhooks.py`
- Modify: `backend/pyproject.toml` (add pytest config)

**Steps:**
1. Add pytest + pytest-asyncio to pyproject.toml dev deps
2. Create conftest with mock fixtures
3. Write tests for bright_data_client (mock SDK calls)
4. Write tests for webhook endpoint (mock FastAPI TestClient)
5. Run: `cd backend && python -m pytest tests/ -v`
6. Commit: `test(backend): add pytest config and tests for bright_data_client and webhooks`

---

## Verification

After all tasks are complete:

1. **Frontend build:** `cd frontend && npm run build` → 0 errors
2. **Frontend tests:** `cd frontend && npx vitest run` → all pass
3. **Backend import check:** `cd backend && python -c "from api.main import app"` → no errors
4. **Backend tests:** `cd backend && python -m pytest tests/ -v` → all pass
5. **File length audit:** No file in frontend/src or backend/ exceeds 150 lines (excluding UI primitives in components/ui/)
6. **No regressions:** App loads and all 4 tabs function correctly

---

## Summary

| Phase | Tasks | Parallelizable? | Estimated Files Changed |
|-------|-------|-----------------|------------------------|
| 1: Docs | 1 | N/A | 1 |
| 2: Core splits | 2-3 | Sequential | ~25 |
| 3: Component splits | 4-17 | Yes (all independent) | ~45 |
| 4: Data splits | 18-20 | Yes | ~15 |
| 5: Backend splits | 21-24 | Yes (all independent) | ~20 |
| 6: Security | 25-28 | Yes | ~8 |
| 7: Performance | 29-32 | Partially | ~6 |
| 8: Testing | 33-36 | Yes | ~8 |
| **Total** | **36 tasks** | | **~128 files** |
