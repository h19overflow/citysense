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

## Agent Inventory
| Agent | Entry Point | LLM | Purpose |
|-------|-------------|-----|---------|
| Mayor | `mayor/agent.py` | Gemini | Municipal data analysis for admin dashboard |
| Citizen | `citizen/agent.py` | Gemini | Service discovery & guidance for citizens |
| Roadmap | `citizen/roadmap_agent.py` | Gemini | Personalized civic-service step-by-step plans |
| Comment Analysis | `citizen/comment_analysis.py` | Gemini | Batch sentiment analysis of article comments |
| CV Analyzer | `citizen/cv_analyzers/agent.py` | Gemini | Extract skills, experience, tools from CV pages |

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
