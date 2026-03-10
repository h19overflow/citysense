# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MontgomeryAI** — a civic navigator platform for Montgomery, Alabama. Built for the **World Wide Vibes Hackathon (WWV Mar 2026)**, deadline March 9, 2026, prize $5,000. Bonus points for Bright Data usage (must be explicitly documented). Frontend lives entirely in `montgomery-navigator/`.

## Hackathon Evaluation Criteria

This project is scored via `ApplicationClaimsEvaluator.md` on 5 dimensions (1–10 each):

1. **Feature Completeness & Claim Accuracy** — Every feature claimed in docs must be implemented in code. Evaluators cross-check docs vs. code and mark ✅/⚠️/❌. Never document a feature that isn't built.
2. **Architecture Robustness** — Modular, decoupled, error-handled, with API boundaries. No business logic in UI layers.
3. **Code Complexity & Maintainability** — Low coupling, single-responsibility, consistent style. The 150-line file / 30-line function limits directly serve this score.
4. **Real-World Readiness** — Security, performance, observability. Lower bar for a hackathon prototype but still scored.
5. **Documentation Quality** — Docs must match reality. Bright Data usage must be explicitly documented to earn bonus points.

## Commands

All commands run from `montgomery-navigator/`:

```bash
cd montgomery-navigator

npm run dev          # Start dev server (Vite)
npm run build        # Production build — must pass with 0 errors before committing
npm run lint         # ESLint
npm test             # Run tests (Vitest)
npm run test:watch   # Watch mode
```

Bun is also available (`bun run dev`, etc.) — the lockfile is `bun.lockb`.

## Architecture

### Entry Points

- `src/main.tsx` → `src/App.tsx` — sets up React Query, Router, and `AppProvider`
- Routes: `/` (Splash), `/app/:view` (CommandCenter), everything else → 404
- `src/pages/CommandCenter.tsx` — the main app shell; renders the correct view based on `state.activeView`

### Views (tabs)

| `AppView` value | Component | Description |
|----------------|-----------|-------------|
| `"services"` | `ServicesView.tsx` | Interactive Leaflet map + directory of 8 service categories |
| `"cv"` | `CvUploadView.tsx` | CV upload, job matching, market pulse, upskilling |
| `"profile"` | `ProfileView.tsx` | Citizen persona dashboard |
| `"news"` | `NewsView.tsx` | Montgomery news feed (Medium-style) |

Navigation is URL-driven: `/app/services`, `/app/cv`, `/app/profile`, `/app/news`. The URL and `state.activeView` are kept in sync inside `CommandCenter.tsx`.

### Global State

All state lives in `src/lib/appContext.tsx` — a `useReducer`-based context with 50+ actions. No component-local state for shared data.

```
useApp() → { state: AppState, dispatch }
```

Key state fields: `activeView`, `citizenMeta` (active persona), `cvData`, `jobMatches`, `trendingSkills`, `servicePoints`, `newsArticles`, `messages`.

All types are in `src/lib/types.ts`.

### Component Structure

```
src/components/
├── app/
│   ├── cv/          ← Career Growth tab components
│   ├── services/    ← Services tab components
│   ├── news/        ← News tab components
│   └── *.tsx        ← Shared: TopBar, FlowSidebar, FloatingChatBubble, MobileNav, etc.
├── mockup/          ← Phone frame mockup (demo/presentation use)
└── ui/              ← shadcn/ui primitives (do not edit)
```

### Data Sources

1. **Mock data** — `public/data/` — static JSON for citizens, jobs, services, news feed
2. **ArcGIS REST API** — `src/lib/arcgisService.ts` — 31 public city endpoints
3. **Bright Data** — live scraping for jobs (Indeed, LinkedIn), gov sites, news; see `docs/bright-data-integration.md`

Citizen personas: `public/data/mock_citizens.json` (5 realistic profiles with full CV, goals, barriers).

### Key Library Files

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/appContext.tsx` | Global state + reducer |
| `src/lib/jobMatcher.ts` | CV-to-job matching engine |
| `src/lib/arcgisService.ts` | ArcGIS REST client |
| `src/lib/newsService.ts` | News fetch + polling |
| `src/lib/demoResponses.ts` | Canned AI chat responses for demo |
| `src/lib/chatHelpers.ts` | Message construction utilities |

## Conventions

- **File length**: 150 lines max — split into helpers if exceeded
- **Function length**: 30 lines max — extract helpers
- **State pattern**: All shared state flows through `appContext.tsx` reducer
- **Component pattern**: Each feature gets its own folder under `components/app/`
- **No auto-commits**: Always stage, show diff, wait for approval
- **Commit format**: `feat(scope): description`, `fix(scope): description`
- **Build gate**: `npm run build` must pass with 0 errors

## Adding a New View

1. Add the view key to `AppView` type in `src/lib/types.ts`
2. Add `VALID_VIEWS` entry in `CommandCenter.tsx`
3. Add render block in `CommandCenter.tsx`
4. Add nav entry in `FlowSidebar.tsx` and `MobileNav.tsx`
5. Create component folder `src/components/app/<view>/`