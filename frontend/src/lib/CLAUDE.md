# Frontend Library (src/lib/)

> **Self-Updating Rule:** Any new service, type, context slice, or utility added to `lib/` MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| Global app state shape | `context/initialState.ts`, `types/state.ts` |
| Add new action | `context/types.ts`, relevant `context/slices/*.ts`, `context/reducer.ts` |
| News fetching | `newsService.ts` |
| Job fetching | `jobService.ts` |
| Services data | `govServices.ts`, `archgisService.ts` |
| Job matching | `jobMatcher.ts`, `jobMatcherHelpers.ts` |
| Upskilling | `upskillingEngine.ts` |
| Commute/transit | `commuteEngine.ts`, `transitService.ts` |
| Misinfo scoring | `misinfo/misinfoService.ts`, `misinfo/heuristicScorer.ts`, `misinfo/geminiAnalyzer.ts` |
| API base URL | `apiConfig.ts` |
| Auth hook | `useAuth.ts` |
| CV upload/streaming | `cvService.ts`, `sseClient.ts` |
| SSE streaming | `sseClient.ts` |
| Comment persistence | `newsCommentStore.ts` |
| Reaction persistence | `newsReactionStore.ts` |
| Types/interfaces | `types/` directory (see below) |

## State Management (`context/`)
| File | Purpose |
|------|---------|
| `appContext.tsx` | AppProvider + useApp() hook |
| `initialState.ts` | Default state values |
| `reducer.ts` | Root reducer (delegates to slices) |
| `types.ts` | AppAction union type |
| `slices/chatSlice.ts` | Chat messages state |
| `slices/cvSlice.ts` | CV upload/analysis state |
| `slices/jobsSlice.ts` | Job listings/matches state |
| `slices/newsSlice.ts` | News articles/comments/reactions state |
| `slices/servicesSlice.ts` | Service points/categories state |
| `slices/roadmapSlice.ts` | Personalized roadmap state |
| `slices/uiSlice.ts` | UI state (modals, panels) |

## Type Definitions (`types/`)
| File | Exports |
|------|---------|
| `common.ts` | Language, AppView, ActionItem, ProcessingStep |
| `chat.ts` | ChatMessage |
| `jobs.ts` | JobListing, JobMatch, TrendingSkill, CommuteEstimate |
| `services.ts` | ServicePoint, ServiceCategory, GuideMessage |
| `news.ts` | NewsArticle, NewsCategory, NewsComment, ReactionType |
| `profile.ts` | ProfileData, CitizenMeta |
| `cv.ts` | ExperienceEntry, EducationEntry, CVAnalysisResult, PipelineEvent, CVJobStatus |
| `housing.ts` | HousingListing |
| `roadmap.ts` | PersonalizedRoadmap |
| `map.ts` | MapCommand |
| `state.ts` | AppState (full state interface) |
| `index.ts` | Barrel export |

## Services & Engines
| File | Purpose |
|------|---------|
| `newsService.ts` | Fetch articles + comments from API |
| `jobService.ts` | Fetch job listings from API |
| `govServices.ts` | Government service data |
| `archgisService.ts` | ArcGIS map integration |
| `aiChatService.ts` | AI chat responses |
| `jobMatcher.ts` | Match user skills → jobs |
| `jobMatcherHelpers.ts` | Matching utilities |
| `upskillingEngine.ts` | Upskilling recommendations |
| `commuteEngine.ts` | Commute calculations |
| `transitService.ts` | Transit route planning |
| `businessGrowthService.ts` | Entrepreneurship recs |
| `predictiveService.ts` | Predictive analytics (admin) |
| `cvService.ts` | CV upload, job status, SSE streaming |
| `sseClient.ts` | SSE client for streaming |
| `newsCommentStore.ts` | localStorage comments |
| `newsReactionStore.ts` | localStorage reactions |

## Map Utilities
| File | Purpose |
|------|---------|
| `leafletSetup.ts` | Leaflet initialization |
| `mapMarkers.ts` | Generic map markers |
| `newsMapMarkers.ts` | News map markers |
| `newsMapUtils.ts` | News map utilities |
| `newsAggregations.ts` | Neighborhood activity aggregation |
| `neighborhoodScorer.ts` | Neighborhood scoring |

## Other
| File | Purpose |
|------|---------|
| `apiConfig.ts` | API_BASE URL |
| `useAuth.ts` | Clerk auth hook |
| `useDataStream.ts` | SSE/WebSocket hook |
| `useDraggable.ts` | Draggable DOM hook |
| `utils.ts` | Generic utils |
| `chatHelpers.ts` | Message/artifact builders |
| `guideResponses.ts` | Service guide chat responses |
| `civicActions.ts` | Civic action data |
| `citizenProfiles.ts` | Citizen persona definitions |
| `flowDefinitions.ts` | Wizard/flow definitions |
| `toolLabels.ts` | Tool label constants |
| `appMode.ts` | App mode detection |
| `demoResponses/` | Pre-written AI responses |
| `mockJobData/` | Mock job listings by industry |
| `misinfo/` | Misinfo detection (heuristic + Gemini) |
