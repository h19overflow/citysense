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
| Growth Guide handler | `career/growth_handler.py` — builds fresh agent with closure-bound `patch_roadmap_path` tool, injects active path context |
| Growth Guide prompt | `career/prompt.py` — `GROWTH_GUIDE_PROMPT` (proactive growth coach persona) |
| Roadmap edit tool | `career/tools/roadmap_tools.py` — `build_patch_roadmap_tool()` closure factory, calls CRUD directly |
| Growth tools builder | `career/tools/registry.py` — `build_growth_tools()` helper |
| Growth Guide chat | `career/growth_handler.py`, `career/prompt.py` (GROWTH_GUIDE_PROMPT) |
| Growth Guide tools | `career/tools/roadmap_tools.py`, `career/tools/registry.py` (build_growth_tools) |
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
| Growth Guide | `career/growth_handler.py` | Gemini | Proactive growth coach — advises on active roadmap path, can mutate roadmap fields via closure-bound tool |
| Strategist | `growth/strategist_agent.py` | Gemini | Reads link headers, generates personalized CrawlStrategy per URL |
| Crawl | `growth/crawl_agent.py` | Gemini | Crawls one URL per agent instance, runs in parallel |
| Analysis | `growth/analysis_agent.py` | Gemini | Two-stage analysis: preliminary + final with diff |
| Curriculum | `growth/curriculum_agent.py` | Gemini | **NOT YET BUILT** — takes RoadmapPath + learning prefs, finds courses + milestone projects |

## Career Agent (`career/`)
| File | Purpose |
|------|---------|
| `agent.py` | `build_career_agent()`, `handle_career_chat()` — intent-classified, context prefix controls tool use |
| `prompt.py` | System prompt with intent classification + `GROWTH_GUIDE_PROMPT` (proactive growth coach persona) |
| `schemas.py` | `CareerAgentResponse` — `skill_gaps: list = []`, `upskill_resources: list = []` (optional, default empty) |
| `tools/registry.py` | CAREER_TOOLS = [search_local_jobs, search_web_jobs]. `build_growth_tools()` adds closure-bound `patch_roadmap_path` |
| `growth_handler.py` | `handle_growth_chat()` — builds fresh agent per request with `patch_roadmap_path` tool. `_build_growth_context_prefix()` injects active path data |
| `tools/roadmap_tools.py` | `build_patch_roadmap_tool(analysis_id, path_key, citizen_id)` — closure factory. Calls `update_roadmap_path_fields` CRUD directly. `_parse_field_update` converts field/value to JSONB merge dict |

**Dual-mode chat:** `career_chat.py` router switches between Career Guide (default) and Growth Guide (`growth_mode=True`). Growth mode uses `growth_handler.py` with roadmap cache for path context.

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

### 1. Career agent receives active roadmap path — DONE
Implemented in `career/growth_handler.py`, `career/tools/roadmap_tools.py`, `career/prompt.py`, `career/tools/registry.py`. Schema updated in `api/schemas/career_schemas.py` with `growth_mode`, `active_roadmap_analysis_id`, `active_roadmap_path_key`, `discuss_context`. Router mode switching in `api/routers/career_chat.py`. Roadmap cache in `api/routers/roadmap_cache.py`. CRUD in `db/crud/growth_path.py`.

### 2. Roadmap mutation endpoint (for direct frontend edits)
**Status:** CRUD layer (`update_roadmap_path_fields` with JSONB merge, IDOR check) is DONE. REST endpoint (`PATCH /api/growth/roadmap/{analysis_id}`) not yet wired — for future inline editing UI.

### 3. Curriculum builder agent
**Key design constraint:** The curriculum is always scoped to a specific `(analysis_id, path_key)` pair — this is how we know which roadmap path it belongs to. `path_key` is the discriminator that ties the curriculum to one of the three paths.

**Files to create:**
- `growth/curriculum_agent.py` — `build_curriculum(path, user_prefs, history) -> CurriculumResult`
- `growth/curriculum_prompts.py` — system + human prompts
- `growth/tools/course_search_tool.py` — BrightData SERP for courses by skill name
- `growth/tools/project_search_tool.py` — BrightData/GitHub SERP for projects by skill name
- `core/curriculum_service.py` — orchestrates agent, persists, SSE streaming
- `db/models/curriculum.py` — `Curriculum` + `CurriculumItem` models
- `db/crud/curriculum.py` — CRUD, including `get_curriculum_by_path(session, analysis_id, path_key)`
- `api/routers/curriculum.py`

**IMPORTANT: curriculum agent tools call CRUD directly, not HTTP.**
```python
# growth/tools/course_search_tool.py
@tool
async def search_courses_for_skill(skill_name: str, free_only: bool = False) -> list[dict]:
    """Search BrightData SERP for courses matching a skill. Returns title, url, provider, is_free."""
    results = await serp_search(f"{skill_name} online course {'free' if free_only else ''}")
    return parse_course_results(results)

# growth/tools/project_search_tool.py
@tool
async def search_projects_for_skill(skill_name: str, difficulty: str = "beginner") -> list[dict]:
    """Search for GitHub projects or tutorials to use as milestone for this skill."""
    results = await serp_search(f"{skill_name} {difficulty} project tutorial github")
    return parse_project_results(results)
```

**DB schema:**
```python
class Curriculum(Base):
    __tablename__ = "curriculums"
    id: UUID (PK)
    analysis_id: UUID  # FK → roadmap_analyses.id
    path_key: str      # "fill_gap" | "multidisciplinary" | "pivot" — ties this to one RoadmapPath
    citizen_id: UUID
    created_at: datetime
    updated_at: datetime
    # items stored as child rows in CurriculumItem

class CurriculumItem(Base):
    __tablename__ = "curriculum_items"
    id: UUID (PK)
    curriculum_id: UUID  # FK → curriculums.id
    skill_step_index: int  # which SkillStep in the path this belongs to
    resource_type: str     # "course" | "project" | "video" | "book"
    title: str
    url: str
    provider: str          # "Coursera" | "YouTube" | "GitHub" | etc.
    is_free: bool
    estimated_hours: int | None
    completed: bool        # user marks done
```

**Agent behaviour:**
- Receives: `RoadmapPath` (from DB, not from frontend) + learning_style + budget_pref + conversation_history
- For each `SkillStep`: calls `search_courses_for_skill` + `search_projects_for_skill`
- Persists each item via `upsert_curriculum_item(session, ...)` as it resolves — curriculum is built incrementally
- Streams progress via SSE (same pattern as growth progress bus)
- Subsequent turns: user says "YouTube only for step 2" → agent calls `delete_curriculum_items(session, curriculum_id, skill_step_index=2)` then `search_courses_for_skill(skill, free_only=True, provider_hint="youtube")` → persists new items
- All tool calls go through CRUD — no HTTP round-trips
