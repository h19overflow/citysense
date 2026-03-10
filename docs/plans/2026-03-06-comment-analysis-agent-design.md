# Comment Analysis Agent — Design Document

**Date:** 2026-03-06
**Branch:** news/sentiment
**Model:** Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`) via LangChain v1
**Reference:** [create_agent API](https://reference.langchain.com/python/langchain/agents/factory/create_agent)

## Problem

- Article sentiment is rule-based keyword matching — no context understanding
- Citizen comments exist in localStorage only — no analysis, no backend persistence
- The mayor has no way to converse with an AI about citizen sentiment
- Comment volume will grow beyond what manual review can handle

## Solution

Two systems sharing the same Gemini model via LangChain v1:

1. **Batch Pipeline** — `ChatGoogleGenerativeAI.with_structured_output()` chain parses comments per article, replaces rule-based sentiment, generates admin summaries
2. **Mayor Chat Agent** — `create_agent()` with 4 tools + `.astream()` so the mayor can converse about citizen concerns with streaming responses

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Admin Dash    │  │ Mayor Chat   │  │ News Map   │ │
│  │ (summaries,   │  │ (SSE stream) │  │ (updated   │ │
│  │  charts)      │  │              │  │  sentiment)│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
└─────────┼──────────────────┼────────────────┼────────┘
          │                  │                │
          ▼                  ▼                ▼
┌─────────────────────────────────────────────────────┐
│              FASTAPI BACKEND (scripts/api/)           │
│                                                      │
│  POST /api/analysis/run     ← trigger batch          │
│  GET  /api/analysis/results ← read analysis JSON     │
│  POST /api/chat             ← mayor chat (SSE)      │
│  GET  /api/analysis/status  ← pipeline status        │
└──────────┬──────────────────┬────────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────────────────┐
│ Batch Pipeline   │  │ Mayor Chat Agent             │
│ (LangChain)      │  │ (LangChain create_agent)     │
│                  │  │                              │
│ ChatGoogleGen... │  │ create_agent(                │
│ .with_structured │  │   model=llm,                 │
│ _output(schema)  │  │   tools=[4 tools],           │
│                  │  │   system_prompt=MAYOR_PROMPT  │
│ Per article:     │  │ )                            │
│  1. Strip PII    │  │                              │
│  2. Invoke chain │  │ .astream() → SSE             │
│  3. Parse output │  │                              │
│  4. Save JSON    │  │                              │
└───────┬──────────┘  └──────────┬───────────────────┘
        │                        │ reads from
        ▼                        │
┌────────────────┐◄──────────────┘
│ Static JSON    │
│  results.json  │
│  metrics.jsonl │
└────────────────┘
```

## LangChain v1 Integration

### Model Setup

```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite-preview",
    temperature=0,
    max_output_tokens=8192,
)
```

### Batch Pipeline — Structured Output Chain

```python
analysis_chain = prompt | llm.with_structured_output(ArticleAnalysis)

result: ArticleAnalysis = await analysis_chain.ainvoke({
    "article_title": article.title,
    "article_excerpt": article.excerpt,
    "comments": redacted_comments,
})
```

### Mayor Chat — create_agent with Streaming

```python
from langchain.agents import create_agent

def get_sentiment_summary(time_range: str = "7d") -> str:
    """Get city-wide sentiment breakdown and trend for a time range."""
    ...

def get_top_concerns(limit: int = 5, neighborhood: str | None = None) -> str:
    """Get ranked citizen concerns with comment counts."""
    ...

def get_neighborhood_mood(neighborhood: str) -> str:
    """Get sentiment breakdown and top articles for a neighborhood."""
    ...

def get_article_details(article_id: str) -> str:
    """Get full analysis for a specific article."""
    ...

agent = create_agent(
    model=llm,
    tools=[get_sentiment_summary, get_top_concerns,
           get_neighborhood_mood, get_article_details],
    system_prompt=MAYOR_SYSTEM_PROMPT,
)

# Streaming — yields chunks as the agent reasons + calls tools
async for chunk in agent.astream(
    {"messages": [{"role": "user", "content": user_message}]},
    stream_mode="updates",
):
    yield chunk  # → SSE event to frontend
```

## Trigger Strategy

**Hybrid: on-demand + nightly batch**

- `POST /api/analysis/run` — mayor clicks "Analyze Now" on admin dashboard
- Nightly cron (or manual) — catches all new comments since last run
- Idempotent: skips articles with no new comments (hash-based change detection)

## Data Schemas

### Batch Pipeline Input (per article)

```json
{
  "article_id": "9f35bf6a7695",
  "title": "Two Montgomery Men Sentenced on Federal Firearms Charges",
  "excerpt": "...",
  "comments": [
    { "id": "cmt-1", "content": "This is getting out of hand...", "createdAt": "..." }
  ]
}
```

### Batch Pipeline Output (LangChain structured output)

```python
class CommentAnalysis(BaseModel):
    comment_id: str
    sentiment: Literal["positive", "neutral", "negative"]
    confidence: float  # 0.0-1.0
    topics: list[str]  # 1-3 civic topics
    flagged: bool      # urgent civic concern

class ArticleAnalysis(BaseModel):
    article_id: str
    article_sentiment: Literal["positive", "neutral", "negative"]
    article_confidence: float
    sentiment_breakdown: dict[str, int]
    comments: list[CommentAnalysis]
    topic_clusters: list[str]
    admin_summary: str        # 2-3 sentences for mayor
    urgent_concerns: list[str]

class AnalysisResults(BaseModel):
    analyzed_at: str
    model_version: str
    prompt_version: str
    total_articles: int
    total_comments: int
    articles: list[ArticleAnalysis]
```

## Mayor Chat Agent

### Tools (4 read-only, plain functions with docstrings)

| Tool | Input | Output |
|------|-------|--------|
| `get_sentiment_summary` | `time_range?` | City-wide sentiment breakdown + trend |
| `get_top_concerns` | `limit?, neighborhood?` | Ranked concern list with comment counts |
| `get_neighborhood_mood` | `neighborhood` | Per-neighborhood sentiment + top articles |
| `get_article_details` | `article_id` | Full analysis for one article |

All tools read from `analysis_results.json` — no LLM calls inside tools.

### System Prompt

The agent is briefed as a civic data analyst for Montgomery, AL. It:
- Speaks in plain English, no jargon
- Leads with the most urgent concerns
- Cites specific neighborhoods and article titles
- Never reveals raw citizen names or PII

### Streaming

`agent.astream()` with `stream_mode="updates"` → FastAPI `StreamingResponse` → SSE.
Frontend consumes via `EventSource` for real-time token delivery.

## PII & Guardrails

### Input Sanitization (before LangChain chain)

Regex-based PII stripping:
- Phone: `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`
- Email: standard pattern
- Address: `\d+ \w+ (St|Ave|Rd|Blvd|Dr|Ln)` patterns
- Replace with `[REDACTED]`

### System Prompt Guardrails

- "Analyze civic sentiment only. Do not reference specific individuals."
- "Score sentiment toward the civic issue, not toward political figures."
- "Flag threats or hate speech but exclude from summary content."

### Confidence Gating

- `>= 0.80` — trusted, included in all aggregates
- `0.60 - 0.79` — included but marked for spot-check
- `< 0.60` — excluded from aggregates, logged

## Frontend Integration

### Admin Dashboard Changes

- New "AI Insights" card: `admin_summary` from latest analysis
- "Analyze Now" button → `POST /api/analysis/run`
- Pipeline status indicator (idle/running/complete/failed)
- Sentiment charts updated to use LLM-derived values

### Mayor Chat Page

- Route: `/admin/chat`
- Chat UI consuming SSE stream from `/api/chat`
- Pre-seeded suggestions ("What are the top concerns?", "How does Downtown feel?")
- Chat history persisted in localStorage

### News Map Updates

- Article sentiment uses LLM-derived value when available
- Falls back to rule-based if not yet analyzed

## File Structure

```
scripts/
  api/
    main.py                 # FastAPI app + CORS
    routers/
      analysis.py           # POST /run, GET /results, GET /status
      chat.py               # POST /chat (SSE streaming)
  processors/
    analyze_comments.py     # LangChain batch chain (structured output)
    schemas.py              # Pydantic models (shared by chain + API)
    redact_pii.py           # PII regex stripping
  agents/
    mayor_chat.py           # create_agent() + streaming
    tools.py                # 4 tool functions (read analysis JSON)
    prompts.py              # System prompts for batch + chat
  data/
    analysis_results.json   # Pipeline output
    analysis_metrics.jsonl  # Per-run metrics
```

## Monitoring

Per-run JSONL metrics:
- `article_id`, `comment_count`, `sentiment_breakdown`
- `confidence_mean`, `confidence_below_threshold`
- `gemini_input_tokens`, `gemini_output_tokens`, `latency_ms`
- `model_version`, `prompt_version`

## Cost Estimate

Gemini 3.1 Flash Lite pricing (estimated):
- ~150 tokens/comment input, ~50 tokens/comment output
- 50 comments per article = ~10K tokens per article
- 247 articles = ~2.5M tokens per full scan
- Estimated cost: < $0.50 per full city scan

## Dependencies to Add

```toml
langchain>=1.0               # Core framework with create_agent
langchain-google-genai>=4.0  # Gemini integration (consolidated SDK)
langchain-core>=0.3          # Base abstractions
sse-starlette>=2.0           # SSE streaming for FastAPI
```

## Sources

- [create_agent API Reference](https://reference.langchain.com/python/langchain/agents/factory/create_agent)
- [LangChain Agents Docs](https://docs.langchain.com/oss/python/langchain/agents)
- [langchain-google-genai 4.0.0](https://github.com/langchain-ai/langchain-google/discussions/1422)
- [Gemini 3.1 Flash Lite Model Card](https://ai.google.dev/gemini-api/docs/models)
