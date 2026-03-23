# CV / Career Feature

> **Self-Updating Rule:** Any new component, renamed file, or restructured module in `cv/` MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| CV upload flow | `CvUploadView.tsx`, `DropZoneArea.tsx`, `UploadZone.tsx` |
| Career chat sidebar | `CareerChatBubble.tsx`, `CareerChatParts.tsx` |
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
| Active roadmap / focused view | `growth/ActiveRoadmapView.tsx` — hero layout for focused path with learning blocks per skill step |
| Learning blocks display | `growth/LearningBlockCard.tsx` — individual learning block UI (title, description, resources) |
| Growth Plan API + state | `growth/hooks/useGrowthPlan.ts`, `../../../lib/context/slices/growthSlice.ts` |
| Career chat | `CareerChatBubble.tsx` — simple career-only chat (no roadmap context) |
| Job matching logic | `../../lib/jobMatcher.ts`, `../../lib/jobMatcherHelpers.ts` |
| CV state | `../../lib/context/slices/cvSlice.ts`, `../../lib/context/slices/jobsSlice.ts` |

## Sub-directories
| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `job-match/` | Job matching UI | `JobMatchPanel.tsx`, `JobMatchCard.tsx`, `JobMatchCardHeader.tsx`, `JobMatchCardDetail.tsx`, `JobResultsList.tsx` |
| `market/` | Market analysis | `MarketPulse.tsx`, `MetricCard.tsx`, `HorizontalBarRow.tsx` |
| `growth/` | Growth Plan UI — intake → progress → roadmap selection → active path → curriculum | `GrowthPlanView.tsx`, `GrowthIntakeForm.tsx`, `GrowthProgress.tsx`, `PathCard.tsx`, `GapQuestionCards.tsx`, `FinalRoadmap.tsx`, `ActiveRoadmapView.tsx`, `hooks/useGrowthPlan.ts` |

## Root Component Files
| File | Purpose |
|------|---------|
| `CareerChatBubble.tsx` | Fixed 400px right panel — career-only chat for job guidance and upskilling |
| `CareerChatParts.tsx` | Extracted sub-components: PanelHeader, IdleState, TypingIndicator, ChatBubbleMessage |
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

### 1. Career chat knows the active roadmap — DONE
Global state has `activeRoadmapPath`, `activeRoadmapAnalysisId`, `activeRoadmapPathKey`. `PathCard` dispatches `SET_ACTIVE_ROADMAP_PATH`.

### 2. Active roadmap focused view — DONE
`ActiveRoadmapView.tsx` renders hero layout for the focused path with learning blocks per skill step. `GrowthPlanView` shows it when `state.activeRoadmapPath` is set. "Back to all paths" clears active path.

### 3. Learning blocks display — DONE
`LearningBlockCard.tsx` displays individual block UI (title, description, learning resources). `ActiveRoadmapView` fetches and renders blocks from `GET /api/growth/learning-blocks/{analysis_id}/{path_key}`.
