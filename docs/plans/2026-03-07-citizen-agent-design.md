# Citizen Agent Enhancement Design

## Goal
Replace the rule-based citizen chatbot with a LangChain agent powered by Gemini 3.1 Flash Lite, with tools for querying live ArcGIS service data, emitting map commands to the frontend, and performing web searches.

## Architecture
```
POST /api/citizen-chat
  → CitizenAgent (LangChain + Gemini 3.1 Flash Lite)
      → Tools: search_services, get_service_details, filter_map_category,
               zoom_to_service, search_montgomery_web
      → Structured output: answer, chips, map_commands, source_items
  → JSON response (same schema as current)
```

## Directory Structure
```
backend/agents/
  common/
    __init__.py
    llm.py                 # shared LLM factory
    web_search.py           # Bright Data SERP
  mayor/
    __init__.py
    agent.py
    prompt.py
    tools/
      __init__.py
      registry.py
      analysis_tools.py
      news_tools.py
  citizen/
    __init__.py
    agent.py
    prompt.py
    tools/
      __init__.py
      registry.py
      service_tools.py      # ArcGIS live + gov_services.json
      map_command_tools.py   # emit MapCommand for frontend
```

## Tools
| Tool | Purpose | Source |
|---|---|---|
| search_services | Find services by category/keyword | ArcGIS live → JSON fallback |
| get_service_details | Eligibility, how to apply, docs needed | gov_services.json |
| filter_map_category | Filter map to a category | Emits MapCommand |
| zoom_to_service | Zoom map to a location | Emits MapCommand |
| search_montgomery_web | Real-time web info | Bright Data SERP |

## LLM
- Model: gemini-3.1-flash-lite
- Temperature: 0.3
- Max tokens: 4096

## Data Sources
- ArcGIS: 8 categories (health, childcare, education, community, libraries, safety, parks, police)
- gov_services.json: 12 curated services with eligibility/application details
- Bright Data SERP: web search scoped to Montgomery AL

## Response Schema
Same as current CitizenChatResponse — no frontend changes needed.

## Decisions
- LangChain agent (not rule-based) — full tool-calling via Gemini
- ArcGIS live queries with JSON fallback if GIS is unreachable
- Modular agent directories — each agent is self-contained
- Old chatbot code stays for reference, not deleted
