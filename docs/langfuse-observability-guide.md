# Langfuse Observability Guide — Everything You Need to Know

> A hands-on guide to understanding and using Langfuse tracing, prompt versioning, A/B testing, and drift detection in the Pegasus codebase.

---

## Table of Contents

1. [What is Langfuse and Why Do We Use It?](#1-what-is-langfuse-and-why-do-we-use-it)
2. [How Traces Work](#2-how-traces-work)
3. [Our Architecture](#3-our-architecture)
4. [Prompt Versioning — The Big Idea](#4-prompt-versioning--the-big-idea)
5. [A/B Testing Prompts — Measuring What Works](#5-ab-testing-prompts--measuring-what-works)
6. [Drift Detection — Keeping Prompts in Sync](#6-drift-detection--keeping-prompts-in-sync)
7. [Practical Guide: Common Tasks](#7-practical-guide-common-tasks)
8. [Langfuse Dashboard Walkthrough](#8-langfuse-dashboard-walkthrough)
9. [Glossary](#9-glossary)

---

## File Map — Where Everything Lives

> Use this as a quick reference. Every section below links back to these files.

### Monitoring Layer

| File | Purpose |
|------|---------|
| [`backend/agents/common/monitoring/__init__.py`](../backend/agents/common/monitoring/__init__.py) | Public API — re-exports all monitoring functions |
| [`backend/agents/common/monitoring/langfuse_client.py`](../backend/agents/common/monitoring/langfuse_client.py) | Singleton Langfuse connection with graceful degradation |
| [`backend/agents/common/monitoring/callback_factory.py`](../backend/agents/common/monitoring/callback_factory.py) | Creates trace-aware LangChain callbacks |
| [`backend/agents/common/monitoring/prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py) | Versioned prompt fetch with caching and fallback |
| [`backend/agents/common/monitoring/ab_testing.py`](../backend/agents/common/monitoring/ab_testing.py) | Weighted A/B variant selection + offline experiments |
| [`backend/agents/common/monitoring/drift_detector.py`](../backend/agents/common/monitoring/drift_detector.py) | Detects prompt drift between code and Langfuse |
| [`backend/agents/common/monitoring/README.md`](../backend/agents/common/monitoring/README.md) | Technical README with Mermaid diagrams |

### LLM Factory

| File | Purpose |
|------|---------|
| [`backend/agents/common/llm.py`](../backend/agents/common/llm.py) | `build_llm()` + `build_traced_chain()` — LLM construction with optional tracing |

### Prompt Files (Local Fallbacks)

| File | Prompt(s) | Langfuse Name |
|------|-----------|---------------|
| [`backend/agents/mayor/prompt.py`](../backend/agents/mayor/prompt.py) | `MAYOR_CHAT_PROMPT`, `BATCH_ANALYSIS_PROMPT` | `mayor-chat`, `comment-analysis` |
| [`backend/agents/citizen/prompt.py`](../backend/agents/citizen/prompt.py) | `CITIZEN_CHAT_PROMPT` | `citizen-chat` |
| [`backend/agents/career/prompt.py`](../backend/agents/career/prompt.py) | `CAREER_AGENT_PROMPT` | `career-chat` |
| [`backend/agents/citizen/cv_analyzers/prompts.py`](../backend/agents/citizen/cv_analyzers/prompts.py) | `CV_PAGE_ANALYSIS_PROMPT` | `cv-page-analysis` |
| [`backend/agents/citizen/cv_analyzers/synthesizer.py`](../backend/agents/citizen/cv_analyzers/synthesizer.py) | `_SYNTHESIZER_PROMPT` | `cv-role-synthesis` |
| [`backend/agents/citizen/roadmap_agent.py`](../backend/agents/citizen/roadmap_agent.py) | `SYSTEM_PROMPT` | `civic-roadmap` |
| [`backend/agents/growth/prompts.py`](../backend/agents/growth/prompts.py) | `STRATEGIST_PROMPT`, `CRAWL_AGENT_PROMPT`, `ANALYSIS_PRELIMINARY_PROMPT`, `ANALYSIS_FINAL_PROMPT` | `growth-strategist`, `growth-crawl`, `growth-analysis-preliminary`, `growth-analysis-final` |
| [`backend/agents/growth/skill_agent_prompt.py`](../backend/agents/growth/skill_agent_prompt.py) | `SKILL_AGENT_SYSTEM_PROMPT` | `growth-skill` |

### Traced Agent Files

| File | Trace Name | Where tracing is added |
|------|-----------|------------------------|
| [`backend/agents/mayor/agent.py`](../backend/agents/mayor/agent.py) | `mayor-chat` | `stream_mayor_response()` |
| [`backend/agents/citizen/agent.py`](../backend/agents/citizen/agent.py) | `citizen-chat` | `handle_citizen_chat()` |
| [`backend/agents/career/agent.py`](../backend/agents/career/agent.py) | `career-analysis`, `career-chat` | `run_career_analysis()`, `handle_career_chat()` |
| [`backend/agents/citizen/cv_analyzers/agent.py`](../backend/agents/citizen/cv_analyzers/agent.py) | `cv-page-analysis` | `analyze_cv_page()` |
| [`backend/agents/citizen/cv_analyzers/synthesizer.py`](../backend/agents/citizen/cv_analyzers/synthesizer.py) | `cv-role-synthesis` | `synthesize_cv_roles()` |
| [`backend/agents/citizen/roadmap_agent.py`](../backend/agents/citizen/roadmap_agent.py) | `civic-roadmap` | `generate_personalized_roadmap()` |
| [`backend/agents/citizen/comment_analysis.py`](../backend/agents/citizen/comment_analysis.py) | `comment-analysis` | `_analyze_single_article()` |
| [`backend/agents/growth/strategist_agent.py`](../backend/agents/growth/strategist_agent.py) | `growth-strategist` | `run_strategist_agent()` |
| [`backend/agents/growth/crawl_agent.py`](../backend/agents/growth/crawl_agent.py) | `growth-crawl` | `run_crawl_agent()` |
| [`backend/agents/growth/analysis_agent.py`](../backend/agents/growth/analysis_agent.py) | `growth-analysis-preliminary`, `growth-analysis-final` | `run_preliminary_analysis()`, `run_final_analysis()` |
| [`backend/agents/growth/skill_agent.py`](../backend/agents/growth/skill_agent.py) | `growth-skill` | `run_skill_agent()` |

### Tests

| File | What it tests |
|------|--------------|
| [`backend/tests/agents/test_langfuse_client.py`](../backend/tests/agents/test_langfuse_client.py) | Singleton, graceful degradation, caching |
| [`backend/tests/agents/test_callback_factory.py`](../backend/tests/agents/test_callback_factory.py) | Callback creation, config building |
| [`backend/tests/agents/test_prompt_registry.py`](../backend/tests/agents/test_prompt_registry.py) | Prompt fetch, fallback, caching |
| [`backend/tests/agents/test_ab_testing.py`](../backend/tests/agents/test_ab_testing.py) | Weighted selection, distribution |
| [`backend/tests/agents/test_drift_detector.py`](../backend/tests/agents/test_drift_detector.py) | Drift detection, error handling |
| [`backend/tests/agents/test_traced_llm.py`](../backend/tests/agents/test_traced_llm.py) | `build_traced_chain()` wiring |

### Scripts & Config

| File | Purpose |
|------|---------|
| [`backend/scripts/upload_prompts_to_langfuse.py`](../backend/scripts/upload_prompts_to_langfuse.py) | Seed Langfuse with all 12 prompts |
| [`.env`](../.env) | `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL` |

---

## 1. What is Langfuse and Why Do We Use It?

### The Problem

When you call an LLM (like Gemini), you send a prompt and get a response. But in production:

- **You can't see what happened.** Which prompt version was used? How long did it take? How many tokens did it consume?
- **You can't compare.** Is the new prompt better than the old one? You don't know without data.
- **You can't debug.** A user reports bad output. Which agent produced it? What was the input? What went wrong?
- **You can't iterate safely.** Changing a prompt means redeploying code. If it breaks, you need another deploy to roll back.

### The Solution: Langfuse

Langfuse is an **LLM observability platform**. Think of it as "Datadog for LLM calls." It gives you:

| Capability | What it does |
|-----------|-------------|
| **Tracing** | Records every LLM call: input, output, latency, tokens, cost |
| **Prompt Management** | Store prompts in Langfuse, version them, deploy without code changes |
| **A/B Testing** | Split traffic between prompt versions, compare metrics |
| **Experiments** | Run prompts against test datasets offline |
| **Scoring** | Attach quality scores (user feedback, automated eval) to traces |

### Mental Model

```
Before Langfuse:
    Agent → LLM → Response  (invisible, no data)

After Langfuse:
    Agent → LLM → Response
      ↓
    Langfuse captures: prompt used, response, latency, tokens, cost
      ↓
    Dashboard: filter by agent, user, date, prompt version
```

---

## 2. How Traces Work

### What is a Trace?

A **trace** is a complete record of one agent invocation — from the moment it receives input to when it returns output. Every LLM call, tool call, and chain step within that invocation is recorded as a **span** inside the trace.

```
Trace: "mayor-chat" (2.3s, 1,200 tokens)
├── Span: ChatPromptTemplate (0.1ms)
├── Span: ChatGoogleGenerativeAI (2.1s, 1,100 tokens)
│   ├── Input: "What are the top concerns in downtown?"
│   └── Output: "Based on 13 comments, road safety is the..."
└── Span: ToolCall: get_recent_comments (0.2s)
```

### How Traces Get Created

The callback handler lives in [`callback_factory.py`](../backend/agents/common/monitoring/callback_factory.py). Every agent uses it via `build_langfuse_config()`:

```python
# This is what happens inside every agent (e.g., backend/agents/mayor/agent.py:63)
from backend.agents.common.monitoring import build_langfuse_config

# 1. Create a config with the Langfuse callback
config = build_langfuse_config(agent_name="mayor-chat")

# 2. Pass it to the LangChain invoke call
result = await chain.ainvoke({"input": "..."}, config=config)

# 3. Langfuse automatically records everything that happened
```

See a real example: [`backend/agents/mayor/agent.py`](../backend/agents/mayor/agent.py) line 63 — the mayor's streaming agent.

The `config` dict contains a LangChain `CallbackHandler`. This handler gets notified at every step of the chain (LLM start, LLM end, tool call, etc.) and sends the data to Langfuse Cloud in the background.

### What Gets Recorded

For each trace:
- **Trace name** — which agent (`mayor-chat`, `career-analysis`, etc.)
- **Input/Output** — what went in, what came out
- **Latency** — total time and per-span breakdown
- **Token usage** — input tokens, output tokens, total
- **Cost** — estimated cost based on model pricing
- **Metadata** — user ID, session ID, tags, prompt version
- **Status** — success or error

### Graceful Degradation

Implemented in [`langfuse_client.py`](../backend/agents/common/monitoring/langfuse_client.py) lines 55-64:

If Langfuse is down or credentials aren't set:
- `get_langfuse()` returns `None`
- `build_langfuse_config()` returns `{}` (empty dict)
- LangChain ignores empty config — the agent runs normally
- No traces are recorded, but **the agent never fails because of monitoring**

This is a critical design principle: **monitoring is never a reason for production failure**.

---

## 3. Our Architecture

### The Monitoring Layer

We built an abstraction layer between our agents and Langfuse. No agent imports Langfuse directly — everything goes through [`backend/agents/common/monitoring/__init__.py`](../backend/agents/common/monitoring/__init__.py).

```
┌─────────────────────────────────────────────┐
│              Agent Layer                     │
│  mayor, citizen, career, growth, cv, etc.   │
└──────────────────┬──────────────────────────┘
                   │ imports from
┌──────────────────▼──────────────────────────┐
│     Monitoring Layer (agents/common/monitoring/)  │
│                                              │
│  langfuse_client.py    → singleton client    │
│  callback_factory.py   → trace callbacks     │
│  prompt_registry.py    → versioned prompts   │
│  ab_testing.py         → A/B selection       │
│  drift_detector.py     → drift checks        │
└──────────────────┬──────────────────────────┘
                   │ calls
┌──────────────────▼──────────────────────────┐
│           Langfuse Cloud                     │
└─────────────────────────────────────────────┘
```

### Why an Abstraction Layer?

1. **Single point of change** — if Langfuse changes their API, we update one module
2. **Testable** — we can mock the monitoring layer in tests (see [`test_callback_factory.py`](../backend/tests/agents/test_callback_factory.py))
3. **Swappable** — could replace Langfuse with another provider
4. **Clean agent code** — agents don't need to know about observability internals

### Module Responsibilities

| Module | Single Responsibility | Source |
|--------|----------------------|--------|
| `langfuse_client.py` | Create and cache the Langfuse connection | [View](../backend/agents/common/monitoring/langfuse_client.py) |
| `callback_factory.py` | Create LangChain callbacks with trace metadata | [View](../backend/agents/common/monitoring/callback_factory.py) |
| `prompt_registry.py` | Fetch, cache, and version prompts | [View](../backend/agents/common/monitoring/prompt_registry.py) |
| `ab_testing.py` | Select between prompt variants by weight | [View](../backend/agents/common/monitoring/ab_testing.py) |
| `drift_detector.py` | Compare local vs remote prompts | [View](../backend/agents/common/monitoring/drift_detector.py) |

---

## 4. Prompt Versioning — The Big Idea

### The Old Way (Hardcoded Prompts)

```python
# In backend/agents/mayor/prompt.py — prompt lives in the codebase
MAYOR_CHAT_PROMPT = """You are a concise civic analyst for the Mayor..."""

# To change the prompt:
# 1. Edit the Python file
# 2. Commit to git
# 3. Push to CI
# 4. Deploy to production
# 5. Hope it works
# 6. If it doesn't, repeat steps 1-5 to roll back
```

**Problems:**
- Changing a word in a prompt requires a full deploy cycle
- No history of what changed
- Rolling back means another deploy
- Can't test a new prompt on a subset of traffic

### The New Way (Langfuse-Managed Prompts)

Implemented in [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py) — specifically the `get_managed_prompt()` function:

```python
# Prompt is fetched from Langfuse at runtime
prompt = get_managed_prompt("mayor-chat", fallback=MAYOR_CHAT_PROMPT)
# Returns the "production" version from Langfuse
# Falls back to MAYOR_CHAT_PROMPT if Langfuse is down
```

**How versions work in Langfuse:**

```
Prompt: "mayor-chat"
  ├── v1 (Jan 15) — original prompt              [archived]
  ├── v2 (Feb 2)  — added recommendation format  [archived]
  ├── v3 (Mar 10) — tighter brevity rules        [production]  ← agents use this
  └── v4 (Mar 20) — experimental new tone         [candidate]   ← A/B test candidate
```

**Key concepts:**

| Concept | Explanation |
|---------|-------------|
| **Name** | A stable identifier. `"mayor-chat"` always refers to the mayor's prompt, regardless of version. |
| **Version** | Each edit creates a new version (v1, v2, v3...). Old versions are never deleted. |
| **Label** | A movable pointer. `"production"` points to the version agents should use. You can move it to any version instantly. |
| **Fallback** | If Langfuse is unreachable, the local hardcoded prompt (from the [prompt files listed above](#prompt-files-local-fallbacks)) is used. Agents never fail. |

### All 12 Managed Prompts

Uploaded by [`backend/scripts/upload_prompts_to_langfuse.py`](../backend/scripts/upload_prompts_to_langfuse.py):

| Langfuse Name | Local Fallback File | Used By |
|---------------|-------------------|---------|
| `mayor-chat` | [`mayor/prompt.py`](../backend/agents/mayor/prompt.py) | [`mayor/agent.py`](../backend/agents/mayor/agent.py) |
| `comment-analysis` | [`mayor/prompt.py`](../backend/agents/mayor/prompt.py) | [`citizen/comment_analysis.py`](../backend/agents/citizen/comment_analysis.py) |
| `citizen-chat` | [`citizen/prompt.py`](../backend/agents/citizen/prompt.py) | [`citizen/agent.py`](../backend/agents/citizen/agent.py) |
| `career-chat` | [`career/prompt.py`](../backend/agents/career/prompt.py) | [`career/agent.py`](../backend/agents/career/agent.py) |
| `cv-page-analysis` | [`cv_analyzers/prompts.py`](../backend/agents/citizen/cv_analyzers/prompts.py) | [`cv_analyzers/agent.py`](../backend/agents/citizen/cv_analyzers/agent.py) |
| `cv-role-synthesis` | [`cv_analyzers/synthesizer.py`](../backend/agents/citizen/cv_analyzers/synthesizer.py) | [`cv_analyzers/synthesizer.py`](../backend/agents/citizen/cv_analyzers/synthesizer.py) |
| `civic-roadmap` | [`citizen/roadmap_agent.py`](../backend/agents/citizen/roadmap_agent.py) | [`citizen/roadmap_agent.py`](../backend/agents/citizen/roadmap_agent.py) |
| `growth-strategist` | [`growth/prompts.py`](../backend/agents/growth/prompts.py) | [`growth/strategist_agent.py`](../backend/agents/growth/strategist_agent.py) |
| `growth-crawl` | [`growth/prompts.py`](../backend/agents/growth/prompts.py) | [`growth/crawl_agent.py`](../backend/agents/growth/crawl_agent.py) |
| `growth-analysis-preliminary` | [`growth/prompts.py`](../backend/agents/growth/prompts.py) | [`growth/analysis_agent.py`](../backend/agents/growth/analysis_agent.py) |
| `growth-analysis-final` | [`growth/prompts.py`](../backend/agents/growth/prompts.py) | [`growth/analysis_agent.py`](../backend/agents/growth/analysis_agent.py) |
| `growth-skill` | [`growth/skill_agent_prompt.py`](../backend/agents/growth/skill_agent_prompt.py) | [`growth/skill_agent.py`](../backend/agents/growth/skill_agent.py) |

### How to Change a Prompt (No Deploy Needed!)

1. Open Langfuse → Prompts → `"mayor-chat"`
2. Click "New version" → edit the text → Save
3. New version appears as `v4` with label `"latest"`
4. When ready: drag the `"production"` label to `v4`
5. Within 5 minutes, agents pick up the new version (cache TTL)
6. **No code change. No deploy. No downtime.**

### How to Roll Back

1. Open Langfuse → Prompts → `"mayor-chat"`
2. Move the `"production"` label back to `v3`
3. Within 5 minutes, agents revert to the old prompt
4. **Instant rollback. No deploy.**

### The Cache

Implemented in [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py) lines 89-127. The `_prompt_cache` dict stores prompts with timestamps:

```
Request 1 (00:00): Cache miss → fetch from Langfuse → cache → return v3
Request 2 (00:01): Cache hit → return v3 (no API call)
Request 3 (00:02): Cache hit → return v3
...
Request N (05:01): Cache expired → fetch from Langfuse → cache → return v4
                   (if you moved the production label to v4)
```

Default TTL is `DEFAULT_CACHE_TTL_SECONDS = 300` (5 minutes), defined at line 83 of [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py).

### Trace Linking

Every trace in Langfuse shows which prompt version produced it. This is automatic — the `ManagedPrompt.to_chat_prompt()` method (line 73 of [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py)) attaches `metadata={"langfuse_prompt": prompt}` to the `ChatPromptTemplate`, which the callback handler reads and records.

In the dashboard: click any trace → see "Prompt: mayor-chat v3" in the metadata.

---

## 5. A/B Testing Prompts — Measuring What Works

### The Problem

You've rewritten a prompt. You think it's better. But "better" is subjective. Maybe it's more verbose. Maybe it hallucinates more. Maybe users prefer the old one. **Without data, you're guessing.**

### The Solution: Live Traffic Splitting

Implemented in [`ab_testing.py`](../backend/agents/common/monitoring/ab_testing.py) — the `select_prompt_variant()` function.

A/B testing sends a percentage of traffic to the new prompt and compares outcomes.

```
100 requests arrive at the mayor agent:
  ├── 80 requests → v3 (production)  → traces tagged "variant:production"
  └── 20 requests → v4 (candidate)   → traces tagged "variant:candidate"

After 1 week, compare in Langfuse dashboard:
  production: avg latency 1.2s, avg tokens 800, 92% positive feedback
  candidate:  avg latency 1.4s, avg tokens 950, 88% positive feedback
  → Candidate is slower, more expensive, and users like it less. Don't promote it.
```

### How to Set Up an A/B Test

**Step 1: Create the candidate in Langfuse**
- Prompts → `"mayor-chat"` → New version → edit → Save
- Label the new version `"candidate"`

**Step 2: Add variant selection to your agent**

Uses `select_prompt_variant()` from [`ab_testing.py`](../backend/agents/common/monitoring/ab_testing.py), `get_managed_prompt()` from [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py), and `build_langfuse_config()` from [`callback_factory.py`](../backend/agents/common/monitoring/callback_factory.py):

```python
from backend.agents.common.monitoring import (
    select_prompt_variant,
    get_managed_prompt,
    build_langfuse_config,
)

# Define the traffic split
variants = [
    {"label": "production", "weight": 0.8},   # 80% of traffic
    {"label": "candidate",  "weight": 0.2},   # 20% of traffic
]

# Each request randomly selects a variant
selected = select_prompt_variant("mayor-chat", variants)

# Fetch the selected version from Langfuse
prompt = get_managed_prompt("mayor-chat", fallback=FALLBACK, label=selected)

# Tag the trace so you can filter in the dashboard
config = build_langfuse_config(
    agent_name="mayor-chat",
    tags=[f"variant:{selected}"],
)

result = await chain.ainvoke({"input": "..."}, config=config)
```

**Step 3: Monitor in Langfuse**
- Traces → filter by tag `variant:production` → note latency, tokens, errors
- Traces → filter by tag `variant:candidate` → compare
- Scores → if you have user feedback, compare satisfaction

**Step 4: Decide**
- Candidate wins? → Move `"production"` label to new version → remove A/B code
- Candidate loses? → Remove A/B code → keep current production

### When to A/B Test

| Scenario | A/B Test? |
|----------|-----------|
| Major prompt rewrite | Yes |
| Testing a cheaper model | Yes |
| Adding/removing instructions | Yes |
| Fixing a typo | No, just deploy |
| Internal classification prompt | No, use offline experiments |

### Offline Experiments (Alternative to A/B)

Uses `run_experiment()` from [`ab_testing.py`](../backend/agents/common/monitoring/ab_testing.py):

1. Create a **dataset** in Langfuse with input/expected-output pairs
2. Run `run_experiment()` with your candidate prompt against the dataset
3. Compare results in the Langfuse experiments tab
4. Promote only if the candidate matches or beats expected outputs

This is good for regression testing before you even start an A/B test.

---

## 6. Drift Detection — Keeping Prompts in Sync

### What is Drift?

Drift happens when the prompt in your code (the local fallback) and the prompt in Langfuse diverge:

| Scenario | Cause | Risk |
|----------|-------|------|
| Someone edits the prompt in Langfuse UI | Normal workflow | Low — Langfuse is the source of truth |
| Someone edits the Python file but not Langfuse | Forgot to sync | Medium — fallback is different from production |
| Langfuse is down and fallback activates | Outage | High — users get a different prompt version |

### How Drift Detection Works

Uses `check_prompt_drift()` from [`drift_detector.py`](../backend/agents/common/monitoring/drift_detector.py). Returns a `DriftReport` dataclass (defined at line 38):

```python
from backend.agents.common.monitoring import check_prompt_drift
from backend.agents.mayor.prompt import MAYOR_CHAT_PROMPT  # local fallback

report = check_prompt_drift("mayor-chat", MAYOR_CHAT_PROMPT)

print(report.status)        # "synced" | "drifted" | "unknown"
print(report.is_drifted)    # True/False
print(report.diff_summary)  # "DRIFT DETECTED — local (500 chars) vs remote (520 chars)"
print(report.local_hash)    # MD5 of local prompt
print(report.remote_hash)   # MD5 of Langfuse prompt
print(report.remote_version) # Which version number is in production
```

### When to Check

- **App startup** — check all prompts at boot, log warnings for any drift
- **Before deploying** — CI could run drift checks as a validation step
- **Periodically** — a background task every hour

### What to Do When Drift is Detected

1. **Determine which is correct** — usually Langfuse is the source of truth
2. **If Langfuse is correct**: update the local fallback in the [prompt file](#prompt-files-local-fallbacks)
3. **If code is correct**: re-upload the prompt via [`upload_prompts_to_langfuse.py`](../backend/scripts/upload_prompts_to_langfuse.py)
4. **Either way**: re-run the drift check to confirm `status="synced"`

---

## 7. Practical Guide: Common Tasks

### Add Tracing to a New Agent

Uses `build_langfuse_config()` from [`callback_factory.py`](../backend/agents/common/monitoring/callback_factory.py):

```python
from backend.agents.common.monitoring import build_langfuse_config

async def my_new_agent(input_text: str):
    chain = build_my_chain()
    config = build_langfuse_config(agent_name="my-agent")
    result = await chain.ainvoke({"input": input_text}, config=config)
    return result
```

### Add User Attribution to Traces

```python
config = build_langfuse_config(
    agent_name="career-chat",
    user_id=citizen_id,           # Links trace to a user
    session_id=conversation_id,   # Groups traces in a chat session
    tags=["premium-user"],        # Arbitrary filtering
)
```

### Use build_traced_chain() for New Chains

Uses `build_traced_chain()` from [`llm.py`](../backend/agents/common/llm.py) — wires LLM + prompt + callbacks in one call:

```python
from backend.agents.common.llm import build_traced_chain

chain, config = build_traced_chain(
    agent_name="my-agent",
    prompt_template="You are a helpful {role}",
    structured_output=MySchema,  # optional Pydantic model
)
result = await chain.ainvoke({"input": "..."}, config=config)
```

### Upload a New Prompt to Langfuse

Add it to [`backend/scripts/upload_prompts_to_langfuse.py`](../backend/scripts/upload_prompts_to_langfuse.py) inside `_collect_all_prompts()`:
```python
_register("my-new-prompt", MY_PROMPT_TEXT)
```
Then run: `python -m backend.scripts.upload_prompts_to_langfuse`

### Use a Managed Prompt in an Agent

Uses `get_managed_prompt()` from [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py):

```python
from backend.agents.common.monitoring import get_managed_prompt

# Fetches from Langfuse, falls back to local if unavailable
prompt = get_managed_prompt("my-agent-prompt", fallback=LOCAL_PROMPT)

# Use it in a ChatPromptTemplate
template = prompt.to_chat_prompt()  # Returns ChatPromptTemplate with version metadata
```

---

## 8. Langfuse Dashboard Walkthrough

### Where to Find Things

| What you want | Where to look |
|---------------|---------------|
| All traces for an agent | Traces → filter by Name = "mayor-chat" |
| Traces for a specific user | Traces → filter by User ID |
| A specific conversation | Traces → filter by Session ID |
| Prompt versions | Prompts → click prompt name |
| A/B test results | Traces → filter by Tag "variant:production" vs "variant:candidate" |
| Token costs | Traces → sort by Cost (descending) |
| Errors | Traces → filter by Status = Error |
| Experiment results | Experiments tab |

### Key Metrics to Watch

| Metric | What it tells you | Action |
|--------|------------------|--------|
| **Latency** | How slow is the LLM call? | >5s means consider a faster model |
| **Token usage** | How much is each call costing? | High tokens = prompt might be too verbose |
| **Error rate** | How often do calls fail? | >5% means check the prompt or model |
| **Cost per trace** | Monthly spend per agent | Budget planning |

---

## 9. Glossary

| Term | Definition |
|------|-----------|
| **Trace** | A complete record of one agent invocation |
| **Span** | One step within a trace (LLM call, tool call, chain step) |
| **Callback Handler** | A LangChain object that captures events and sends them to Langfuse. Created in [`callback_factory.py`](../backend/agents/common/monitoring/callback_factory.py) |
| **Prompt Version** | A numbered snapshot of a prompt (v1, v2, v3...) |
| **Label** | A movable pointer on a prompt version ("production", "candidate", "latest") |
| **Fallback** | The local hardcoded prompt used when Langfuse is unreachable. See [prompt files](#prompt-files-local-fallbacks) |
| **Variant** | One side of an A/B test (e.g., "production" or "candidate"). Selected in [`ab_testing.py`](../backend/agents/common/monitoring/ab_testing.py) |
| **Drift** | When local fallback and Langfuse prompt disagree. Detected by [`drift_detector.py`](../backend/agents/common/monitoring/drift_detector.py) |
| **TTL** | Time-to-live — how long a cached prompt stays before re-fetching (5 min default, set in [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py)) |
| **Dataset** | A collection of input/expected-output pairs for offline experiments |
| **Experiment** | Running a prompt against a dataset. Uses `run_experiment()` in [`ab_testing.py`](../backend/agents/common/monitoring/ab_testing.py) |
| **Graceful Degradation** | The system continues working even if monitoring is unavailable. Implemented in [`langfuse_client.py`](../backend/agents/common/monitoring/langfuse_client.py) |
| **ManagedPrompt** | Wrapper class with template + version metadata. Defined in [`prompt_registry.py`](../backend/agents/common/monitoring/prompt_registry.py) |
| **DriftReport** | Dataclass with drift check results. Defined in [`drift_detector.py`](../backend/agents/common/monitoring/drift_detector.py) |

---

## Quick Reference Card

```python
# ── Add tracing to any agent (2 lines) ──
# Source: backend/agents/common/monitoring/callback_factory.py
config = build_langfuse_config(agent_name="my-agent")
result = await chain.ainvoke(input, config=config)

# ── Fetch a versioned prompt ──
# Source: backend/agents/common/monitoring/prompt_registry.py
prompt = get_managed_prompt("name", fallback=LOCAL, label="production")

# ── A/B test a prompt ──
# Source: backend/agents/common/monitoring/ab_testing.py
label = select_prompt_variant("name", [
    {"label": "production", "weight": 0.8},
    {"label": "candidate", "weight": 0.2},
])

# ── Check for drift ──
# Source: backend/agents/common/monitoring/drift_detector.py
report = check_prompt_drift("name", LOCAL_PROMPT)

# ── Upload prompts ──
# Source: backend/scripts/upload_prompts_to_langfuse.py
python -m backend.scripts.upload_prompts_to_langfuse
```
