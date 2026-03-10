# CLAUDE.md — MontgomeryAI Navigator
> **Owner:** Hamza Khaled Mahmoud Ahmed — AI Engineer & Data Scientist
> **Event:** World Wide Vibes Hackathon (WWV Mar 2026) — GenAI.Works Academy
> **Last Updated:** March 6, 2026
> **Deadline:** March 9, 2026
> **Status:** Phase 6 — Docs, tests, polish.

---

## What We Are Building

**MontgomeryAI** is a civic navigator platform for Montgomery, Alabama. It helps residents navigate benefits, find jobs, access city services, and stay informed — all from one interface.

The frontend is a React + TypeScript + Vite + Tailwind CSS + shadcn/ui app in `frontend/`.

### Current Tabs (5 views)

| Tab | View Key | Purpose | Key Components |
|-----|----------|---------|----------------|
| **Services** | `services` | Interactive map + directory of 8 service categories with ArcGIS data | `ServicesView.tsx`, `ServiceDirectory.tsx`, `ServiceMapView.tsx`, `ServiceGuideCards.tsx` |
| **News** | `news` | Community news feed with reactions, comments, sentiment, and newsletter | `NewsView.tsx`, `NewsCard.tsx`, `NewsDetail.tsx`, `CommentFeed.tsx` |
| **Admin** | `admin` | Admin dashboard — AI insights, comment analysis, mayor's brief, citizen view | `AdminDashboard.tsx`, `AIInsightsCard.tsx`, `MayorsBrief.tsx`, `CommentFeed.tsx` |
| **Profile** | `profile` | Citizen persona dashboard — civic snapshot, benefits, settings | `ProfileView.tsx`, `PersonaSelector.tsx` |
| **Career Growth** | `cv` | CV upload, job matching, commute, upskilling | `CvUploadView.tsx`, `JobMatchPanel.tsx`, `CommuteCard.tsx`, `UpskillingPanel.tsx` |

---

## Architecture

```
frontend/
├── public/data/              ← Static JSON data (mock citizens, gov services, jobs, transit)
├── src/
│   ├── components/app/       ← UI components by feature
│   │   ├── cv/               ← Career Growth (36 files)
│   │   ├── services/         ← Services (37 files)
│   │   ├── news/             ← News feed (28 files)
│   │   ├── admin/            ← Admin dashboard (22 files)
│   │   ├── cards/            ← Shared cards (8 files)
│   │   └── *.tsx             ← Shared components (TopBar, FlowSidebar, ChatInput, etc.)
│   ├── lib/                  ← Business logic, data loaders, types
│   │   ├── appContext.tsx     ← Thin provider (30 lines, delegates to context/slices/)
│   │   ├── types.ts          ← All TypeScript interfaces
│   │   ├── citizenProfiles.ts ← Mock citizen data loader
│   │   ├── jobMatcher.ts     ← Job matching engine
│   │   ├── arcgisService.ts  ← ArcGIS REST API client
│   │   └── ...
│   ├── pages/
│   │   └── CommandCenter.tsx  ← Main app shell (3-column layout)
│   └── main.tsx
```

### State Management

Global state via `useReducer` + 7 domain slices in `context/slices/`. `appContext.tsx` is a thin 30-line provider. All views read from `state` and dispatch actions. Key state shape defined in `AppState` interface in `types.ts`.

- `state.activeView` controls which tab renders (`"cv" | "services" | "profile" | "admin" | "news"`)
- `state.citizenMeta` holds the active citizen persona (or null)
- `state.cvData` holds parsed CV data
- `state.jobMatches`, `state.trendingSkills`, `state.upskillingSummary` drive Career Growth
- `state.servicePoints`, `state.activeCategories` drive Services map

### Data Pillars

1. **ArcGIS REST API** — 8 public service layers for Montgomery city data (health, community, childcare, education, safety, libraries, parks, police). Client in `arcgisService.ts`.
2. **Bright Data** — Backend data pipeline for jobs (Indeed, LinkedIn, Glassdoor), government sites (Medicaid, DHR), and news via Web Scraper API, SERP API, and Web Unlocker. Scheduler runs every 15 min; results saved to `public/data/` and broadcast via SSE. See `docs/bright-data-integration.md`.
3. **Mock Data** — 5 realistic citizen personas in `public/data/mock_citizens.json` with 30+ civic fields each, full CVs, goals, and barriers.

---

## Credentials (see `.env.example`)

| Key | Value | Used For |
|-----|-------|----------|
| `BRIGHTDATA_API_KEY` | *(see `.env`)* | Web Scraper API, SERP API, Crawl API |
| Indeed dataset ID | `gd_l4dx9j9sscpvs7no2` | Job scraping |
| LinkedIn dataset ID | `gd_lpfll7v5hcqtkxl6l` | Job scraping |
| Glassdoor dataset ID | `gd_lpfbbndm1xnopbrcr0` | Salary data |

---

## Conventions

- **File length limit**: 150 lines max. Split if exceeded.
- **Function length limit**: 30 lines max. Extract helpers.
- **No auto-commits**: Always stage, show diff, wait for approval.
- **Commit format**: `feat(scope): description`, `fix(scope): description`, etc.
- **Build validation**: Run `npm run build` after changes. 0 errors required.
- **Component pattern**: Each feature gets its own folder under `components/app/`.
- **State pattern**: All state flows through `context/reducer.ts` with 7 domain slices. No local state for shared data.

---

## The Event

| Field | Detail |
|-------|--------|
| **Event** | World Wide Vibes Hackathon (WWV Mar 2026) |
| **Organizer** | GenAI.Works Academy |
| **Submission Deadline** | March 9, 2026 |
| **Prize Pool** | $5,000 |
| **Bonus Points** | Using Bright Data tools (must document explicitly) |
| **Submission** | Working prototype + short demo/presentation |
