# AI Agents

> **Self-Updating Rule:** Any new agent, tool, or prompt change MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| Mayor agent behavior | `mayor/agent.py`, `mayor/prompt.py` |
| Mayor agent tools | `mayor/tools/registry.py` + specific tool file |
| Citizen agent behavior | `citizen/agent.py`, `citizen/prompt.py` |
| Citizen agent tools | `citizen/tools/registry.py` + specific tool file |
| Citizen response schema | `citizen/schemas.py` |
| Roadmap generation | `citizen/roadmap_agent.py` |
| Comment analysis | `citizen/comment_analysis.py` |
| PII redaction | `citizen/redact_pii.py` |
| LLM model/config | `common/llm.py` |
| Web search tool | `common/web_search.py` |
| CV analysis agent | `citizen/cv_analyzers/agent.py` |
| CV analysis prompts | `citizen/cv_analyzers/prompts.py` |
| CV analysis config | `citizen/cv_analyzers/config.py` |
| CV analysis schemas | `citizen/cv_analyzers/schemas.py` |
| CV role inference | `citizen/cv_analyzers/synthesizer.py` |
| Career chat agent | `career/agent.py`, `career/prompt.py` |
| Career chat schema | `career/schemas.py` — `CareerAgentResponse` (skill_gaps + upskill_resources optional with `= []`) |
| Career chat tools | `career/tools/registry.py` — search_local_jobs, search_web_jobs only |
| Growth agent behavior | `growth/strategist_agent.py`, `growth/crawl_agent.py`, `growth/analysis_agent.py` |
| Growth agent tools | `growth/tools/registry.py`, `growth/tools/crawl_tools.py` |
| Growth agent schemas | `growth/schemas.py` |
| Growth agent prompts | `growth/prompts.py`, `growth/analysis_prompts.py` |
| Curriculum builder agent | `growth/curriculum_agent.py` — **NOT YET BUILT** (see Next Steps) |

## Agent Inventory
| Agent | Entry Point | LLM | Purpose |
|-------|-------------|-----|---------|
| Mayor | `mayor/agent.py` | Gemini | Municipal data analysis for admin dashboard |
| Citizen | `citizen/agent.py` | Gemini | Service discovery & guidance for citizens |
| Roadmap | `citizen/roadmap_agent.py` | Gemini | Personalized civic-service step-by-step plans |
| Comment Analysis | `citizen/comment_analysis.py` | Gemini | Batch sentiment analysis of article comments |
| CV Analyzer | `citizen/cv_analyzers/agent.py` | Gemini | Extract skills, experience, tools from CV pages |
| Career Chat | `career/agent.py` | Gemini | Career guidance + job search; intent-classified (SIMPLE / PROFILE_QUESTION / JOB_SEARCH) |
| Strategist | `growth/strategist_agent.py` | Gemini | Reads link headers, generates personalized CrawlStrategy per URL |
| Crawl | `growth/crawl_agent.py` | Gemini | Crawls one URL per agent instance, runs in parallel |
| Analysis | `growth/analysis_agent.py` | Gemini | Two-stage analysis: preliminary + final with diff |
| Curriculum | `growth/curriculum_agent.py` | Gemini | **NOT YET BUILT** — takes RoadmapPath + learning prefs, finds courses + milestone projects |

## Career Agent (`career/`)
| File | Purpose |
|------|---------|
| `agent.py` | `build_career_agent()`, `handle_career_chat()` — intent-classified, context prefix controls tool use |
| `prompt.py` | System prompt with intent classification (SIMPLE / PROFILE_QUESTION / JOB_SEARCH). Casual/profile turns → structured response, no tools. JOB_SEARCH → search_local_jobs then search_web_jobs |
| `schemas.py` | `CareerAgentResponse` — `skill_gaps: list = []`, `upskill_resources: list = []` (optional, default empty) |
| `tools/registry.py` | CAREER_TOOLS = [search_local_jobs, search_web_jobs] — gap/course tools removed |

**Active roadmap context (next step):** `handle_career_chat` context prefix should accept an optional `active_roadmap_path: dict` field. When present, insert it under an `ACTIVE GROWTH PATH` section in the prompt so the agent can reference it, suggest edits, and call `PATCH /api/growth/roadmap/{id}` via a new tool.

## Mayor Agent (`mayor/`)
| File | Purpose |
|------|---------|
| `agent.py` | `build_mayor_agent()`, `stream_mayor_response()` |
| `prompt.py` | System prompt + `BATCH_ANALYSIS_PROMPT` (shared with comment analysis) |
| `tools/registry.py` | Tool registration (12 tools) |
| `tools/analysis_tools.py` | Sentiment summary, top concerns, neighborhood mood |
| `tools/news_tools.py` | Trending articles, search, category breakdown |
| `tools/predictive_tools.py` | Hotspot scores, complaint trends |

## Citizen Agent (`citizen/`)
| File | Purpose |
|------|---------|
| `agent.py` | `build_citizen_agent()`, `handle_citizen_chat()` |
| `prompt.py` | System prompt (service discovery, friendly tone) |
| `schemas.py` | `ServiceItem`, `CitizenAgentResponse` |
| `comment_analysis.py` | `run_batch_analysis()`, `save_analysis_results()`, `merge_community_sentiment()` |
| `redact_pii.py` | `redact_comment_text()` — strips phones, emails, addresses before LLM |
| `roadmap_agent.py` | `generate_personalized_roadmap()` |
| `tools/registry.py` | Tool registration (3 tools) |
| `tools/service_data.py` | gov_services.json loader |
| `tools/service_tools.py` | Service lookup functions |
| `tools/map_command_tools.py` | Map UI commands |

## CV Analyzer (`citizen/cv_analyzers/`)
| File | Purpose |
|------|---------|
| `agent.py` | `build_cv_analyzer_chain()`, `analyze_cv_page()` — per-page extractor |
| `synthesizer.py` | `synthesize_cv_roles()` — post-aggregation role inference from full CV |
| `prompts.py` | `CV_PAGE_ANALYSIS_PROMPT` (no roles — pure extraction) |
| `schemas.py` | Re-exports `PageAnalysis`, `CVAnalysisResult` from core |
| `config.py` | Model, temperature, max_tokens overrides |

## Shared (`common/`)
| File | Purpose |
|------|---------|
| `llm.py` | `build_llm()` factory (Gemini, temp 0.3) |
| `web_search.py` | `search_montgomery_web()` via Bright Data SERP |

## Top-level `tools/` directory
`agents/tools/` is a **backward-compat shim** — `registry.py` re-exports from `mayor/tools/registry.py`. Do not add real code here; work in `mayor/tools/` or `citizen/tools/` directly.

## Growth Agents (`growth/`)
| File | Purpose |
|------|---------|
| `strategist_agent.py` | `run_strategist_agent()` — reads link headers, returns list[CrawlStrategy] |
| `crawl_agent.py` | `run_crawl_agent()`, `run_all_crawl_agents()` — parallel crawl via asyncio.gather |
| `crawl_aggregator.py` | `aggregate_crawl_results()` — deduplicates signals, groups by link_type |
| `analysis_agent.py` | `run_preliminary_analysis()`, `run_final_analysis()` — structured output via with_structured_output |
| `analysis_prompts.py` | `build_preliminary_prompt()`, `build_final_prompt()` |
| `prompts.py` | STRATEGIST_PROMPT, CRAWL_AGENT_PROMPT, ANALYSIS_PRELIMINARY_PROMPT, ANALYSIS_FINAL_PROMPT |
| `schemas.py` | CrawlStrategy, CrawlResult, SkillStep, RoadmapPath, GapQuestion, RoadmapAnalysisResult, StrategistOutput |
| `tools/crawl_tools.py` | `crawl_page` @tool — Bright Data crawl with depth_hint truncation |
| `tools/registry.py` | CRAWL_TOOLS = [crawl_page] |

## Next Steps — Growth Plan Iteration 2

### 1. Career agent receives active roadmap path
**Files:** `career/agent.py`, `career/prompt.py`, `api/routers/career_chat.py`

The frontend will send `active_roadmap_path` (serialized `RoadmapPath`) in the chat request body when the user has selected a path. The context prefix builder should:
1. Include it under an `## ACTIVE GROWTH PATH` section in the system prompt
2. Allow the agent to suggest specific changes ("swap skill X for Y", "extend timeline to 6 months")
3. New tool: `patch_roadmap_path` — calls `PATCH /api/growth/roadmap/{analysis_id}` to mutate the path directly from the agent

**Schema change needed:** Add `active_roadmap_path: dict | None = None` and `active_roadmap_analysis_id: str | None = None` to the career chat request schema (`api/schemas/career_schemas.py`).

### 2. Roadmap mutation endpoint
**Files:** `api/routers/growth.py`, `core/growth_service.py`, `db/crud/growth.py`

`PATCH /api/growth/roadmap/{analysis_id}` — partial update of one path's fields.
```python
# Request body
class RoadmapPatchRequest(BaseModel):
    path_key: Literal["fill_gap", "multidisciplinary", "pivot"]
    updates: dict[str, Any]  # title, skill_steps, timeline_estimate, unfair_advantage
```
- Service: `patch_roadmap_path(session, citizen_id, analysis_id, path_key, updates) -> dict`
- CRUD: `update_roadmap_path_fields(session, analysis_id, path_key, updates)`
- IDOR check: verify `analysis.citizen_id == citizen_id`

### 3. Curriculum builder agent
**Files (to create):**
- `growth/curriculum_agent.py` — `build_curriculum(path, user_prefs, conversation_history) -> CurriculumResult`
- `growth/curriculum_prompts.py` — system + human prompts
- `growth/tools/course_search_tool.py` — BrightData SERP search for courses by skill name
- `growth/tools/project_search_tool.py` — GitHub/BrightData search for beginner projects per skill
- `core/curriculum_service.py` — orchestrates agent, persists to DB, SSE streaming
- `db/models/curriculum.py` — `Curriculum` model linked to `RoadmapAnalysis`
- `db/crud/curriculum.py` — CRUD for curriculum + individual resource items
- `api/routers/curriculum.py` — `POST /growth/roadmap/{id}/curriculum`, `GET /growth/roadmap/{id}/curriculum`, SSE stream

**Agent behaviour:**
- Receives: `RoadmapPath` + learning_style + budget_preference ("free only" / "paid ok") + conversation_history
- For each `SkillStep` in the path: searches for 1-2 courses + 1 project milestone
- Streams results as it finds them (SSE per skill step)
- Subsequent turns can swap resources: "YouTube only", "add a project for step 3", "find something more advanced"
- All mutations persist back to `Curriculum` model — curriculum is a living document

**DB schema:**
```python
class Curriculum(Base):
    id: UUID
    analysis_id: UUID  # FK → roadmap_analyses
    path_key: str      # fill_gap / multidisciplinary / pivot
    citizen_id: UUID
    items: list[CurriculumItem]  # JSON or child table

class CurriculumItem(Base):
    skill_step_index: int
    resource_type: str   # course / project / book / video
    title: str
    url: str
    provider: str        # Coursera / YouTube / GitHub / etc.
    is_free: bool
    estimated_hours: int | None
    completed: bool      # user can mark done
```
