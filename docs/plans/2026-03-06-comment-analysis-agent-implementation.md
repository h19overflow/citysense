# Comment Analysis Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a LangChain-powered comment analysis pipeline and mayor chat agent using Gemini 3.1 Flash Lite.

**Architecture:** Batch pipeline (`with_structured_output`) analyzes comments per article → saves to JSON. Mayor chat agent (`create_agent` + 4 tools) reads analysis JSON and streams responses via SSE. FastAPI serves both endpoints.

**Tech Stack:** Python 3.13, LangChain v1, langchain-google-genai 4.0, FastAPI, SSE-Starlette, Gemini 3.1 Flash Lite

**Design Doc:** `docs/plans/2026-03-06-comment-analysis-agent-design.md`

---

## Batch 1: Dependencies + Schemas (foundation, no LLM calls)

### Task 1: Install dependencies

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add dependencies**

Add to `pyproject.toml` dependencies array:

```toml
"langchain>=1.0",
"langchain-google-genai>=4.0",
"langchain-core>=0.3",
"sse-starlette>=2.0",
```

**Step 2: Install**

Run: `cd /c/Users/User/Projects/Pegasus && uv sync`
Expected: all packages resolve and install

**Step 3: Verify imports**

Run: `uv run python -c "from langchain.agents import create_agent; from langchain_google_genai import ChatGoogleGenerativeAI; print('OK')"`
Expected: `OK`

---

### Task 2: Create Pydantic schemas

**Files:**
- Create: `scripts/processors/schemas.py`

**Step 1: Write schemas**

```python
"""Pydantic schemas for comment analysis pipeline.

Shared by the batch chain (structured output) and the API layer.
"""

from pydantic import BaseModel, Field
from typing import Literal


class CommentAnalysis(BaseModel):
    comment_id: str
    sentiment: Literal["positive", "neutral", "negative"]
    confidence: float = Field(ge=0.0, le=1.0)
    topics: list[str] = Field(default_factory=list, max_length=3)
    flagged: bool = False


class ArticleAnalysis(BaseModel):
    article_id: str
    article_sentiment: Literal["positive", "neutral", "negative"]
    article_confidence: float = Field(ge=0.0, le=1.0)
    sentiment_breakdown: dict[str, int]
    comments: list[CommentAnalysis]
    topic_clusters: list[str] = Field(default_factory=list)
    admin_summary: str = Field(max_length=500)
    urgent_concerns: list[str] = Field(default_factory=list, max_length=5)


class AnalysisResults(BaseModel):
    analyzed_at: str
    model_version: str
    prompt_version: str
    total_articles: int
    total_comments: int
    articles: list[ArticleAnalysis]
```

**Step 2: Verify import**

Run: `uv run python -c "from scripts.processors.schemas import AnalysisResults; print('OK')"`
Expected: `OK`

---

### Task 3: Create PII redaction utility

**Files:**
- Create: `scripts/processors/redact_pii.py`

**Step 1: Write redaction functions**

```python
"""Regex-based PII stripping for citizen comments.

Strips phone numbers, emails, and street addresses before
sending comment text to the LLM for analysis.
"""

import re

_PHONE_PATTERN = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
_EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_ADDRESS_PATTERN = re.compile(
    r"\b\d+\s+\w+(?:\s+\w+)?\s+(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Cir|Loop|Pkwy)\b",
    re.IGNORECASE,
)


def redact_comment_text(text: str) -> str:
    """Remove PII patterns from a comment string."""
    result = _PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
    result = _EMAIL_PATTERN.sub("[REDACTED_EMAIL]", result)
    result = _ADDRESS_PATTERN.sub("[REDACTED_ADDRESS]", result)
    return result


def scan_output_for_pii(text: str) -> bool:
    """Check if LLM output contains leaked PII. Returns True if PII found."""
    return bool(
        _PHONE_PATTERN.search(text)
        or _EMAIL_PATTERN.search(text)
        or _ADDRESS_PATTERN.search(text)
    )
```

**Step 2: Verify**

Run: `uv run python -c "from scripts.processors.redact_pii import redact_comment_text; print(redact_comment_text('Call 334-555-1234 on 100 Main St'))"`
Expected: `Call [REDACTED_PHONE] on [REDACTED_ADDRESS]`

---

## Batch 2: Batch Analysis Pipeline (LLM calls)

### Task 4: Create analysis prompts

**Files:**
- Create: `scripts/agents/prompts.py`

**Step 1: Write prompts**

```python
"""System prompts for batch analysis and mayor chat agent."""

BATCH_ANALYSIS_PROMPT = """You are a civic data analyst for Montgomery, Alabama.

Analyze the following news article and its citizen comments. For each comment, determine:
1. Sentiment (positive, neutral, negative) toward the civic issue discussed
2. Confidence score (0.0-1.0) in your assessment
3. Key civic topics mentioned (1-3 topics, e.g., "road safety", "school funding")
4. Whether it flags an urgent civic concern

Then provide an overall article-level analysis:
- Aggregate sentiment across all comments
- Identify topic clusters
- Write a 2-3 sentence admin summary for the mayor in plain English
- List any urgent concerns requiring attention

Rules:
- Score sentiment toward the CIVIC ISSUE, not toward political figures
- Do not reference specific individuals by name in summaries
- If a comment contains threats or hate speech, flag it but exclude from summary
- Be concise and actionable — the mayor reads hundreds of these"""

MAYOR_CHAT_PROMPT = """You are a civic data analyst assistant for the Mayor of Montgomery, Alabama.

You help the mayor understand citizen sentiment by analyzing community feedback on local news.

Your style:
- Plain English, no jargon
- Lead with the most urgent concerns
- Cite specific neighborhoods and article titles
- Never reveal citizen names or personal information
- Be concise — the mayor is busy

You have tools to look up sentiment data, top concerns, neighborhood mood, and article details.
Use them to answer the mayor's questions with specific data."""
```

---

### Task 5: Create batch comment analyzer

**Files:**
- Create: `scripts/processors/analyze_comments.py`

**Step 1: Write the batch analyzer**

```python
"""Batch comment analysis using LangChain + Gemini structured output.

Reads news_feed.json + comments, runs per-article analysis via Gemini,
saves results to analysis_results.json.
"""

import json
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

from scripts.config import OUTPUT_FILES, REPO_ROOT
from scripts.processors.schemas import ArticleAnalysis, AnalysisResults
from scripts.processors.redact_pii import redact_comment_text, scan_output_for_pii
from scripts.agents.prompts import BATCH_ANALYSIS_PROMPT

ANALYSIS_OUTPUT = REPO_ROOT / "scripts" / "data" / "analysis_results.json"
METRICS_OUTPUT = REPO_ROOT / "scripts" / "data" / "analysis_metrics.jsonl"
MODEL_NAME = "gemini-3.1-flash-lite-preview"
PROMPT_VERSION = "v1.0"


def build_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=0,
        max_output_tokens=8192,
    )


def build_analysis_chain(llm: ChatGoogleGenerativeAI):
    prompt = ChatPromptTemplate.from_messages([
        ("system", BATCH_ANALYSIS_PROMPT),
        ("human", (
            "Article: {article_title}\n"
            "Excerpt: {article_excerpt}\n\n"
            "Comments ({comment_count} total):\n{comments_text}"
        )),
    ])
    return prompt | llm.with_structured_output(ArticleAnalysis)


def load_comments_for_article(article_id: str, all_comments: list[dict]) -> list[dict]:
    return [c for c in all_comments if c.get("articleId") == article_id]


def compute_comment_hash(comments: list[dict]) -> str:
    ids = sorted(c.get("id", "") for c in comments)
    return hashlib.md5("|".join(ids).encode()).hexdigest()[:12]


def format_comments_for_prompt(comments: list[dict]) -> str:
    lines = []
    for i, c in enumerate(comments, 1):
        redacted = redact_comment_text(c.get("content", ""))
        lines.append(f"{i}. [ID: {c['id']}] {redacted}")
    return "\n".join(lines) if lines else "(no comments)"


def load_previous_results() -> dict[str, str]:
    """Load previous analysis hashes to skip unchanged articles."""
    if ANALYSIS_OUTPUT.exists():
        try:
            data = json.loads(ANALYSIS_OUTPUT.read_text())
            results = AnalysisResults(**data)
            return {a.article_id: "" for a in results.articles}
        except Exception:
            return {}
    return {}


async def analyze_single_article(
    chain, article: dict, comments: list[dict]
) -> ArticleAnalysis | None:
    """Run analysis chain on one article. Returns None on failure."""
    comments_text = format_comments_for_prompt(comments)
    try:
        result: ArticleAnalysis = await chain.ainvoke({
            "article_title": article["title"],
            "article_excerpt": article.get("excerpt", ""),
            "comment_count": str(len(comments)),
            "comments_text": comments_text,
        })
        # Verify article_id matches
        result.article_id = article["id"]
        return result
    except Exception as e:
        print(f"  Failed to analyze {article['id']}: {e}")
        return None


async def run_batch_analysis(
    articles: list[dict],
    comments: list[dict],
) -> AnalysisResults:
    """Run full batch analysis on all articles with comments."""
    llm = build_llm()
    chain = build_analysis_chain(llm)
    results: list[ArticleAnalysis] = []
    total_comments = 0

    for article in articles:
        article_comments = load_comments_for_article(article["id"], comments)
        if not article_comments:
            continue

        print(f"  Analyzing: {article['title'][:60]}... ({len(article_comments)} comments)")
        start = time.time()
        result = await analyze_single_article(chain, article, article_comments)
        elapsed = time.time() - start

        if result:
            results.append(result)
            total_comments += len(article_comments)
            log_metrics(article["id"], len(article_comments), elapsed)

    return AnalysisResults(
        analyzed_at=datetime.now(timezone.utc).isoformat(),
        model_version=MODEL_NAME,
        prompt_version=PROMPT_VERSION,
        total_articles=len(results),
        total_comments=total_comments,
        articles=results,
    )


def save_analysis_results(results: AnalysisResults) -> Path:
    ANALYSIS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    ANALYSIS_OUTPUT.write_text(
        results.model_dump_json(indent=2),
        encoding="utf-8",
    )
    print(f"Saved analysis for {results.total_articles} articles to {ANALYSIS_OUTPUT}")
    return ANALYSIS_OUTPUT


def log_metrics(article_id: str, comment_count: int, latency: float) -> None:
    entry = {
        "article_id": article_id,
        "comment_count": comment_count,
        "latency_ms": round(latency * 1000),
        "model_version": MODEL_NAME,
        "prompt_version": PROMPT_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    with open(METRICS_OUTPUT, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

**Step 2: Verify import**

Run: `uv run python -c "from scripts.processors.analyze_comments import run_batch_analysis; print('OK')"`
Expected: `OK`

---

## Batch 3: Mayor Chat Agent

### Task 6: Create agent tools

**Files:**
- Create: `scripts/agents/tools.py`

**Step 1: Write 4 read-only tools**

```python
"""Read-only tools for the mayor chat agent.

Each tool reads from analysis_results.json and returns
formatted text the agent can use in its response.
"""

import json
from pathlib import Path

from scripts.config import REPO_ROOT

ANALYSIS_PATH = REPO_ROOT / "scripts" / "data" / "analysis_results.json"


def _load_results() -> dict:
    if not ANALYSIS_PATH.exists():
        return {"articles": [], "analyzed_at": "never"}
    return json.loads(ANALYSIS_PATH.read_text())


def get_sentiment_summary(time_range: str = "7d") -> str:
    """Get city-wide sentiment breakdown and trend for a time range."""
    data = _load_results()
    articles = data.get("articles", [])
    if not articles:
        return "No analysis data available. Run the analysis pipeline first."

    pos = sum(1 for a in articles if a["article_sentiment"] == "positive")
    neu = sum(1 for a in articles if a["article_sentiment"] == "neutral")
    neg = sum(1 for a in articles if a["article_sentiment"] == "negative")
    total = len(articles)
    total_comments = sum(len(a.get("comments", [])) for a in articles)

    return (
        f"City-wide sentiment (last analysis: {data.get('analyzed_at', 'unknown')}):\n"
        f"- Positive: {pos}/{total} articles ({pos*100//total}%)\n"
        f"- Neutral: {neu}/{total} articles ({neu*100//total}%)\n"
        f"- Negative: {neg}/{total} articles ({neg*100//total}%)\n"
        f"- Total comments analyzed: {total_comments}"
    )


def get_top_concerns(limit: int = 5, neighborhood: str | None = None) -> str:
    """Get ranked citizen concerns with comment counts, optionally by neighborhood."""
    data = _load_results()
    articles = data.get("articles", [])

    concerns: list[tuple[str, int, str]] = []
    for a in articles:
        for uc in a.get("urgent_concerns", []):
            concerns.append((uc, len(a.get("comments", [])), a["article_id"]))

    if not concerns:
        return "No urgent concerns flagged in the latest analysis."

    concerns.sort(key=lambda x: x[1], reverse=True)
    lines = [f"Top {min(limit, len(concerns))} citizen concerns:"]
    for concern, count, aid in concerns[:limit]:
        lines.append(f"- {concern} ({count} comments, article {aid})")
    return "\n".join(lines)


def get_neighborhood_mood(neighborhood: str) -> str:
    """Get sentiment breakdown and top articles for a specific neighborhood."""
    data = _load_results()
    # Load original news for neighborhood mapping
    news_path = REPO_ROOT / "montgomery-navigator" / "public" / "data" / "news_feed.json"
    if not news_path.exists():
        return f"No news data available for {neighborhood}."

    news = json.loads(news_path.read_text())
    neighborhood_articles = [
        a for a in news.get("articles", [])
        if (a.get("location", {}) or {}).get("neighborhood", "").lower() == neighborhood.lower()
    ]

    if not neighborhood_articles:
        return f"No articles found for neighborhood: {neighborhood}"

    article_ids = {a["id"] for a in neighborhood_articles}
    analysis = {a["article_id"]: a for a in data.get("articles", []) if a["article_id"] in article_ids}

    pos = sum(1 for a in analysis.values() if a["article_sentiment"] == "positive")
    neg = sum(1 for a in analysis.values() if a["article_sentiment"] == "negative")
    neu = sum(1 for a in analysis.values() if a["article_sentiment"] == "neutral")

    lines = [
        f"Neighborhood: {neighborhood}",
        f"Articles: {len(neighborhood_articles)} total, {len(analysis)} analyzed",
        f"Sentiment: +{pos} neutral:{neu} -{neg}",
        "",
        "Top articles:",
    ]
    for a in neighborhood_articles[:5]:
        summary = analysis.get(a["id"], {}).get("admin_summary", a["title"])
        lines.append(f"- {summary}")

    return "\n".join(lines)


def get_article_details(article_id: str) -> str:
    """Get full analysis for a specific article including all comment sentiments."""
    data = _load_results()
    for a in data.get("articles", []):
        if a["article_id"] == article_id:
            comments_summary = []
            for c in a.get("comments", []):
                topics = ", ".join(c.get("topics", []))
                flag = " [FLAGGED]" if c.get("flagged") else ""
                comments_summary.append(
                    f"  - {c['sentiment']} (conf: {c['confidence']:.0%}) topics: {topics}{flag}"
                )
            return (
                f"Article: {article_id}\n"
                f"Sentiment: {a['article_sentiment']} (conf: {a['article_confidence']:.0%})\n"
                f"Summary: {a['admin_summary']}\n"
                f"Topic clusters: {', '.join(a.get('topic_clusters', []))}\n"
                f"Urgent concerns: {', '.join(a.get('urgent_concerns', []))}\n"
                f"Comments ({len(a.get('comments', []))}):\n" +
                "\n".join(comments_summary)
            )
    return f"No analysis found for article {article_id}"
```

**Step 2: Verify**

Run: `uv run python -c "from scripts.agents.tools import get_sentiment_summary; print(get_sentiment_summary())"`
Expected: `No analysis data available. Run the analysis pipeline first.`

---

### Task 7: Create mayor chat agent

**Files:**
- Create: `scripts/agents/mayor_chat.py`
- Create: `scripts/agents/__init__.py`

**Step 1: Write the agent**

```python
"""Mayor chat agent using LangChain create_agent + Gemini.

Provides a conversational interface for the mayor to query
citizen sentiment data via 4 read-only tools with streaming.
"""

from collections.abc import AsyncIterator
from typing import Any

from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage

from scripts.agents.prompts import MAYOR_CHAT_PROMPT
from scripts.agents.tools import (
    get_sentiment_summary,
    get_top_concerns,
    get_neighborhood_mood,
    get_article_details,
)

MODEL_NAME = "gemini-3.1-flash-lite-preview"


def build_mayor_agent():
    """Build the mayor chat agent with tools."""
    llm = ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=0.3,
        max_output_tokens=4096,
    )

    return create_agent(
        model=llm,
        tools=[
            get_sentiment_summary,
            get_top_concerns,
            get_neighborhood_mood,
            get_article_details,
        ],
        system_prompt=MAYOR_CHAT_PROMPT,
    )


def format_chat_history(history: list[dict]) -> list[HumanMessage | AIMessage]:
    """Convert frontend chat history to LangChain message objects."""
    messages = []
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    return messages


async def stream_mayor_response(
    user_message: str,
    chat_history: list[dict],
) -> AsyncIterator[str]:
    """Stream the agent's response token by token."""
    agent = build_mayor_agent()
    history = format_chat_history(chat_history)
    history.append(HumanMessage(content=user_message))

    async for chunk in agent.astream(
        {"messages": history},
        stream_mode="updates",
    ):
        # Extract text content from agent node updates
        if "agent" in chunk:
            messages = chunk["agent"].get("messages", [])
            for msg in messages:
                if hasattr(msg, "content") and msg.content:
                    yield msg.content
```

**Step 2: Create `__init__.py`**

```python
# scripts/agents/__init__.py
```

**Step 3: Verify import**

Run: `uv run python -c "from scripts.agents.mayor_chat import build_mayor_agent; print('OK')"`
Expected: `OK`

---

## Batch 4: FastAPI Backend

### Task 8: Create FastAPI app

**Files:**
- Create: `scripts/api/__init__.py`
- Create: `scripts/api/main.py`

**Step 1: Write the FastAPI app**

```python
"""FastAPI app for comment analysis API and mayor chat."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from scripts.api.routers import analysis, chat

app = FastAPI(title="Montgomery Comment Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

---

### Task 9: Create analysis router

**Files:**
- Create: `scripts/api/routers/__init__.py`
- Create: `scripts/api/routers/analysis.py`

**Step 1: Write the analysis endpoints**

```python
"""Analysis endpoints: trigger batch, get results, get status."""

import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from scripts.config import OUTPUT_FILES, REPO_ROOT
from scripts.processors.analyze_comments import run_batch_analysis, save_analysis_results

router = APIRouter(tags=["analysis"])

ANALYSIS_PATH = REPO_ROOT / "scripts" / "data" / "analysis_results.json"
_status = {"state": "idle", "message": ""}


@router.post("/analysis/run")
async def trigger_analysis(background_tasks: BackgroundTasks):
    """Trigger batch comment analysis."""
    if _status["state"] == "running":
        raise HTTPException(409, "Analysis already running")

    _status["state"] = "running"
    _status["message"] = "Starting analysis..."
    background_tasks.add_task(_run_analysis)
    return {"status": "started"}


async def _run_analysis():
    try:
        # Load articles
        news_path = OUTPUT_FILES["news"]
        if not news_path.exists():
            _status.update(state="failed", message="No news_feed.json found")
            return

        news_data = json.loads(news_path.read_text())
        articles = news_data.get("articles", [])

        # Load comments from exported JSON (frontend exports via admin panel)
        comments_path = REPO_ROOT / "scripts" / "data" / "exported_comments.json"
        comments = []
        if comments_path.exists():
            exported = json.loads(comments_path.read_text())
            comments = exported.get("comments", [])

        if not comments:
            _status.update(state="failed", message="No comments to analyze")
            return

        _status["message"] = f"Analyzing {len(articles)} articles..."
        results = await run_batch_analysis(articles, comments)
        save_analysis_results(results)
        _status.update(
            state="complete",
            message=f"Analyzed {results.total_articles} articles, {results.total_comments} comments",
        )
    except Exception as e:
        _status.update(state="failed", message=str(e))


@router.get("/analysis/results")
async def get_results():
    """Get latest analysis results."""
    if not ANALYSIS_PATH.exists():
        raise HTTPException(404, "No analysis results yet. Run analysis first.")
    return json.loads(ANALYSIS_PATH.read_text())


@router.get("/analysis/status")
async def get_status():
    """Get current pipeline status."""
    return _status
```

---

### Task 10: Create chat router with SSE streaming

**Files:**
- Create: `scripts/api/routers/chat.py`

**Step 1: Write the SSE chat endpoint**

```python
"""Mayor chat endpoint with SSE streaming."""

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from scripts.agents.mayor_chat import stream_mayor_response

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/chat")
async def mayor_chat(request: ChatRequest):
    """Stream mayor chat agent response via SSE."""

    async def event_generator():
        try:
            async for token in stream_mayor_response(
                request.message, request.history
            ):
                yield {"event": "token", "data": token}
            yield {"event": "done", "data": ""}
        except Exception as e:
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(event_generator())
```

**Step 2: Verify server starts**

Run: `cd /c/Users/User/Projects/Pegasus && uv run uvicorn scripts.api.main:app --port 8000 --reload`
Expected: Server starts, `http://localhost:8000/api/health` returns `{"status": "ok"}`

---

## Batch 5: Frontend Integration

### Task 11: Add mayor chat page

**Files:**
- Create: `montgomery-navigator/src/pages/MayorChat.tsx`
- Modify: `montgomery-navigator/src/App.tsx`

**Step 1: Create chat page component**

Simple chat UI that:
- Sends `POST /api/chat` with message + history
- Consumes SSE stream via `EventSource` or `fetch` with readable stream
- Renders messages in a scrollable list
- Persists chat history in localStorage
- Pre-seeded suggestions: "What are the top concerns?", "How does Downtown feel?"

**Step 2: Add route**

In `App.tsx`, add: `<Route path="/admin/chat" element={<MayorChat />} />`

---

### Task 12: Add "Analyze Now" button + AI Insights to admin dashboard

**Files:**
- Modify: `montgomery-navigator/src/pages/AdminDashboard.tsx`
- Create: `montgomery-navigator/src/components/app/admin/AIInsightsCard.tsx`
- Create: `montgomery-navigator/src/components/app/admin/AnalyzeButton.tsx`

**Step 1: Create AnalyzeButton**

Button that calls `POST http://localhost:8000/api/analysis/run`, shows loading state, polls `/api/analysis/status` until complete.

**Step 2: Create AIInsightsCard**

Fetches `GET /api/analysis/results`, displays:
- `admin_summary` from top 3 most-commented articles
- Topic clusters as badges
- Urgent concerns as a bulleted list

**Step 3: Wire into AdminDashboard**

Add both components to the dashboard grid.

---

### Task 13: Add link to mayor chat from admin dashboard

**Files:**
- Modify: `montgomery-navigator/src/pages/AdminDashboard.tsx`

Add a "Chat with AI Analyst" button/link that navigates to `/admin/chat`.

---

## Batch 6: Verification

### Task 14: End-to-end verification

**Step 1: Start backend**

Run: `cd /c/Users/User/Projects/Pegasus && uv run uvicorn scripts.api.main:app --port 8000`

**Step 2: Start frontend**

Run: `cd /c/Users/User/Projects/Pegasus/montgomery-navigator && npm run dev`

**Step 3: Test batch analysis**

- Export comments from admin dashboard (existing ExportControls)
- Copy exported JSON to `scripts/data/exported_comments.json`
- Hit `POST http://localhost:8000/api/analysis/run`
- Check `GET http://localhost:8000/api/analysis/status` until complete
- Verify `scripts/data/analysis_results.json` contains structured results

**Step 4: Test mayor chat**

- Navigate to `/admin/chat`
- Send: "What are the top concerns in Montgomery?"
- Verify streaming response with data from analysis results

**Step 5: TypeScript compile check**

Run: `cd /c/Users/User/Projects/Pegasus/montgomery-navigator && npx tsc --noEmit`
Expected: 0 errors

**Step 6: Commit**

Modular commits following the pattern established earlier:
1. `feat(deps): add langchain and sse-starlette dependencies`
2. `feat(analysis): add schemas, PII redaction, and batch comment analyzer`
3. `feat(agent): add mayor chat agent with 4 civic data tools`
4. `feat(api): add FastAPI backend with analysis and chat endpoints`
5. `feat(frontend): add mayor chat page and AI insights to admin dashboard`
