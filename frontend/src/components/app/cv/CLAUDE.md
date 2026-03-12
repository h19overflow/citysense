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
| Upskilling recs | `upskilling/UpskillingPanel.tsx`, `upskilling/SkillPathCard.tsx` |
| Commute planning | `CommutePanel.tsx`, `CommutePanelMap.tsx`, `CommuteCard.tsx` |
| Travel mode picker | `TravelMode.tsx` |
| Profile bar | `CitizenProfileBar.tsx` |
| Job filtering | `FilterPanel.tsx`, `JobFilters.tsx` |
| Business growth | `BusinessGrowth.tsx` |
| Job matching logic | `../../lib/jobMatcher.ts`, `../../lib/jobMatcherHelpers.ts` |
| Upskilling logic | `../../lib/upskillingEngine.ts` |
| Commute logic | `../../lib/commuteEngine.ts`, `../../lib/transitService.ts` |
| CV state | `../../lib/context/slices/cvSlice.ts`, `../../lib/context/slices/jobsSlice.ts` |

## Sub-directories
| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `job-match/` | Job matching UI | `JobMatchPanel.tsx`, `JobMatchCard.tsx`, `JobMatchCardHeader.tsx`, `JobMatchCardDetail.tsx`, `JobResultsList.tsx` |
| `market/` | Market analysis | `MarketPulse.tsx`, `MetricCard.tsx`, `HorizontalBarRow.tsx` |
| `upskilling/` | Skill development | `UpskillingPanel.tsx`, `SkillPathCard.tsx`, `ImpactHeader.tsx`, `QuickWinsSection.tsx` |

## Root Component Files
| File | Purpose |
|------|---------|
| `CareerChatBubble.tsx` | Fixed right-side panel (400px) that slides in when the career view is active — shows suggestion chips and a placeholder chat input (career assistant not yet wired) |
| `CvUploadView.tsx` | CV upload interface |
| `CvOnboardingHero.tsx` | Onboarding for CV feature |
| `CvResultsPanel.tsx` | Orchestrates result cards with stagger animation |
| `ProfileSummaryBanner.tsx` | Quick stats + AI summary banner |
| `SkillsToolsCard.tsx` | Technical skills, soft skills, tools chips |
| `RolesCard.tsx` | Matched roles display |
| `DropZoneArea.tsx` | File drop zone |
| `UploadZone.tsx` | Upload zone with real API + SSE progress |
| `CitizenProfileBar.tsx` | Profile stats bar |
| `CommutePanel.tsx` | Commute planning |
| `CommutePanelMap.tsx` | Commute map |
| `CommuteCard.tsx` | Commute option card |
| `TravelMode.tsx` | Transport mode selector |
| `TrendingSkillsBar.tsx` | Trending skills |
| `SkillBadges.tsx` | Skill badges |
| `EducationCard.tsx` | Education history |
| `ExperienceCard.tsx` | Work experience |
| `FilterPanel.tsx` | Job filter panel |
| `JobFilters.tsx` | Job filter UI |
| `AnalysisProgress.tsx` | CV analysis progress |
| `BusinessGrowth.tsx` | Business/entrepreneurship |
