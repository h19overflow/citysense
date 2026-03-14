# CV / Career Feature

> **Self-Updating Rule:** Any new component, renamed file, or restructured module in `cv/` MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| CV upload flow | `CvUploadView.tsx`, `DropZoneArea.tsx`, `UploadZone.tsx` |
| Career chat sidebar | `CareerChatBubble.tsx` |
| CV analysis results | `CvResultsPanel.tsx`, `ProfileSummaryBanner.tsx`, `SkillsToolsCard.tsx`, `RolesCard.tsx` |
| Onboarding hero | `CvOnboardingHero.tsx` |
| Job match panel/cards | `job-match/JobMatchPanel.tsx`, `job-match/JobMatchCard.tsx` |
| Job match details | `job-match/JobMatchCardHeader.tsx`, `job-match/JobMatchCardDetail.tsx` |
| Job results list | `job-match/JobResultsList.tsx` |
| Market pulse/salary | `market/MarketPulse.tsx`, `market/MetricCard.tsx` |
| Profile bar | `CitizenProfileBar.tsx` |
| Job filtering | `FilterPanel.tsx`, `JobFilters.tsx` |
| Growth Plan intake + progress | `growth/GrowthIntakeForm.tsx`, `growth/GrowthProgress.tsx` |
| Growth Plan roadmap display | `growth/FinalRoadmap.tsx`, `growth/PathCard.tsx` |
| Growth Plan gap questions | `growth/GapQuestionCards.tsx` |
| Growth Plan orchestrator | `growth/GrowthPlanView.tsx` |
| Active roadmap / focused view | `growth/ActiveRoadmapView.tsx` — **NOT YET BUILT** (see Next Steps) |
| Curriculum builder chat | `growth/CurriculumBuilder.tsx` — **NOT YET BUILT** (see Next Steps) |
| Growth Plan API + state | `growth/hooks/useGrowthPlan.ts`, `../../../lib/context/slices/growthSlice.ts` |
| Career chat context (roadmap) | `CareerChatBubble.tsx` — needs `activeRoadmapPath` passed as context |
| Job matching logic | `../../lib/jobMatcher.ts`, `../../lib/jobMatcherHelpers.ts` |
| CV state | `../../lib/context/slices/cvSlice.ts`, `../../lib/context/slices/jobsSlice.ts` |

## Sub-directories
| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `job-match/` | Job matching UI | `JobMatchPanel.tsx`, `JobMatchCard.tsx`, `JobMatchCardHeader.tsx`, `JobMatchCardDetail.tsx`, `JobResultsList.tsx` |
| `market/` | Market analysis | `MarketPulse.tsx`, `MetricCard.tsx`, `HorizontalBarRow.tsx` |
| `growth/` | Growth Plan UI — intake → progress → roadmap selection → curriculum | `GrowthPlanView.tsx`, `GrowthIntakeForm.tsx`, `GrowthProgress.tsx`, `PathCard.tsx`, `GapQuestionCards.tsx`, `FinalRoadmap.tsx`, `hooks/useGrowthPlan.ts` |

## Root Component Files
| File | Purpose |
|------|---------|
| `CareerChatBubble.tsx` | Fixed 400px right panel — career assistant chat. **Next:** receives `activeRoadmapPath` in context so it can advise on the selected path and edit roadmap fields via `PATCH /api/growth/roadmap/{id}` |
| `CvUploadView.tsx` | Tab container (Job Market / Growth Plan) with slide transition via Framer Motion |
| `CvOnboardingHero.tsx` | Onboarding when no CV uploaded |
| `CvResultsPanel.tsx` | Orchestrates result cards with stagger animation |
| `ProfileSummaryBanner.tsx` | Quick stats + AI summary banner |
| `SkillsToolsCard.tsx` | Technical skills, soft skills, tools chips |
| `RolesCard.tsx` | Matched roles display |
| `DropZoneArea.tsx` | File drop zone |
| `UploadZone.tsx` | Upload zone with real API + SSE progress |
| `CitizenProfileBar.tsx` | Profile stats bar |
| `TrendingSkillsBar.tsx` | Trending skills |
| `SkillBadges.tsx` | Skill badges |
| `EducationCard.tsx` | Education history |
| `ExperienceCard.tsx` | Work experience |
| `FilterPanel.tsx` | Job filter panel |
| `JobFilters.tsx` | Job filter UI |
| `AnalysisProgress.tsx` | CV analysis progress |

## Growth Plan — Current State
The Growth Plan tab is a full pipeline: intake form → crawl + analysis progress (SSE) → 3-path roadmap (fill_gap / multidisciplinary / pivot) displayed as horizontal cards → gap questions → final refined roadmap.

**State machine stages:** `idle → submitting → crawling → preliminary → answering → finalizing → final → returning`

**Key behaviour:**
- `POST /api/growth/intake` returns `intake_id` immediately; pipeline runs as `BackgroundTask`
- SSE at `GET /api/growth/intake/{intake_id}/status` streams progress events (no auth — UUID is sufficient)
- On mount, `loadLatestRoadmap` restores existing roadmap for returning users
- PathCards are horizontal (grid-cols-3), no confidence scores shown

## Next Steps — Growth Plan Iteration 2

### 1. Career chat knows the active roadmap
**Goal:** When the user selects a path (fill_gap / multidisciplinary / pivot), the career chat sidebar receives that path as context so it can answer questions about it, suggest adjustments, and guide the user.

**Implementation sketch:**
- Add `activeRoadmapPath: RoadmapPath | null` and `activeRoadmapAnalysisId: string | null` to global state (`growthSlice`)
- `PathCard` gets a "Focus on this path" button that dispatches `SET_ACTIVE_ROADMAP_PATH`
- `CareerChatBubble` reads `state.activeRoadmapPath` and includes it in the system context sent to the career agent
- Backend: `career_chat.py` context prefix already accepts arbitrary context fields — add `active_roadmap_path` there
- New endpoint: `PATCH /api/growth/roadmap/{analysis_id}` — lets the career agent mutate individual path fields (title, skill_steps, timeline_estimate) in response to user requests

### 2. Active roadmap focused view
**Goal:** After selecting a path the Growth Plan page re-frames around that single path — the other two paths collapse or move to a "compare" drawer.

**Implementation sketch:**
- New component `growth/ActiveRoadmapView.tsx` — hero-style layout for the selected path with skill steps as a checklist, progress tracker, and "Edit with AI" button
- `GrowthPlanView` shows `ActiveRoadmapView` when `state.activeRoadmapPath` is set, `FinalRoadmap` otherwise
- "Back to all paths" button clears `activeRoadmapPath`

### 3. Curriculum builder
**Goal:** A conversational flow that takes the selected roadmap path and builds a personalized learning curriculum — finding real courses, projects, and milestone checkpoints.

**Implementation sketch:**
- New component `growth/CurriculumBuilder.tsx` — chat-style UI, triggered from `ActiveRoadmapView`
- Backend: new agent `backend/agents/growth/curriculum_agent.py` — takes `RoadmapPath` + user learning style + previous conversation, searches for courses (BrightData SERP), suggests GitHub projects as milestones
- New endpoint: `POST /api/growth/roadmap/{analysis_id}/curriculum` — streams curriculum events (SSE or polling)
- New DB model: `Curriculum` linked to `RoadmapAnalysis` — stores course list, project milestones, completion state per skill step
- Curriculum should be dynamic: user can say "swap Coursera for free YouTube resources" and the agent replaces entries
