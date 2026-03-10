# Citizen Agent Implementation Plan

## Step 1: Create `backend/agents/common/`

**Files:**
- `backend/agents/common/__init__.py`
- `backend/agents/common/llm.py` — `build_llm(model, temperature, max_tokens)` factory returning `ChatGoogleGenerativeAI`
- `backend/agents/common/web_search.py` — move `search_montgomery_web()` from `backend/agents/tools/web_search_tool.py`

**Why:** Both mayor and citizen agents share LLM construction and web search. Extract once, import everywhere.

---

## Step 2: Create `backend/agents/mayor/`

**Files:**
- `backend/agents/mayor/__init__.py`
- `backend/agents/mayor/agent.py` — move `build_mayor_agent()`, `stream_mayor_response()`, `format_chat_history()` from `backend/agents/mayor_chat.py`. Import LLM from `common/llm.py`.
- `backend/agents/mayor/prompt.py` — move `MAYOR_CHAT_PROMPT` and `BATCH_ANALYSIS_PROMPT` from `backend/agents/prompts.py`
- `backend/agents/mayor/tools/__init__.py`
- `backend/agents/mayor/tools/registry.py` — move tool registrations from `backend/agents/tools/registry.py`
- `backend/agents/mayor/tools/analysis_tools.py` — move from `backend/agents/tools/analysis_tools.py`
- `backend/agents/mayor/tools/news_tools.py` — move from `backend/agents/tools/news_tools.py`

**Backward compat:** Update `backend/agents/mayor_chat.py` to re-export from `backend/agents/mayor/agent.py`. Update `backend/agents/prompts.py` to re-export from `backend/agents/mayor/prompt.py`. Update `backend/agents/tools/registry.py` to re-export from `backend/agents/mayor/tools/registry.py`.

**Validate:** Run backend, hit `/api/chat` (mayor endpoint), confirm it still works.

---

## Step 3: Create `backend/agents/citizen/tools/`

**Files:**
- `backend/agents/citizen/__init__.py`
- `backend/agents/citizen/tools/__init__.py`
- `backend/agents/citizen/tools/service_tools.py`
  - `search_services(category: str, keyword: str | None) -> str` — queries ArcGIS GIS endpoint for a category, returns formatted list of service points (name, address, phone). Falls back to `civic_services.geojson` if ArcGIS is down.
  - `get_service_details(service_name: str) -> str` — searches `gov_services.json` by title, returns eligibility, how_to_apply, documents_needed, phone, url.
  - `get_nearby_services(category: str, neighborhood: str) -> str` — filters ArcGIS results by approximate neighborhood coordinates.
- `backend/agents/citizen/tools/map_command_tools.py`
  - `filter_map_category(category: str) -> str` — returns a JSON `MapCommand` with `type: "filter_category"`. The API router will extract these from tool calls and include in the response.
  - `zoom_to_location(lat: float, lng: float, label: str) -> str` — returns a JSON `MapCommand` with `type: "zoom_to"`.
  - `clear_map_filters() -> str` — returns a JSON `MapCommand` with `type: "clear"`.
- `backend/agents/citizen/tools/registry.py` — registers all citizen tools as `@tool` wrappers, exports `CITIZEN_TOOLS` list.

**Validate:** Import each tool module, call functions directly with test inputs, confirm no import errors.

---

## Step 4: Create `backend/agents/citizen/agent.py` and `prompt.py`

**Files:**
- `backend/agents/citizen/prompt.py` — `CITIZEN_CHAT_PROMPT` system prompt. Instructs the agent: you are a Montgomery civic assistant, use tools to find services, emit map commands when the user asks to see things on the map, keep answers concise and actionable.
- `backend/agents/citizen/agent.py`
  - `build_citizen_agent()` — creates LangChain agent with `ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite")`, `CITIZEN_TOOLS`, and `CITIZEN_CHAT_PROMPT`. Cached singleton.
  - `handle_citizen_chat(message: str, conversation_id: str | None) -> dict` — invokes the agent, parses the response, extracts any `MapCommand` JSON from tool outputs, assembles the final response dict matching the existing `CitizenChatResponse` schema (answer, chips, map_commands, source_items, etc.).

**Validate:** Call `handle_citizen_chat("find childcare")` directly, confirm structured response.

---

## Step 5: Wire to API router

**File:** `backend/api/routers/citizen_chat.py`

**Changes:**
- Replace the import of `backend.chatbot.responder.handle_chat` with `backend.agents.citizen.agent.handle_citizen_chat`
- Update the `POST /citizen-chat` handler to call the new agent
- Keep the same response JSON shape so frontend needs zero changes
- Keep `/predictions/hotspots` and `/predictions/trends` endpoints unchanged

**Validate:** `curl -X POST http://127.0.0.1:8082/api/citizen-chat -d '{"message":"find childcare"}'` returns structured response with real service data.

---

## Step 6: End-to-end testing

- Test each intent: find_service, report_issue, events, new_resident, job_loss
- Test map commands: ask "show me healthcare on the map" → verify `map_commands` in response
- Test web search: ask about something not in local data
- Test frontend sidebar: open http://localhost:8080/app/services, use guide chat, verify chips and map filtering work
- Test fallback: stop backend, verify frontend falls back to demo responses
