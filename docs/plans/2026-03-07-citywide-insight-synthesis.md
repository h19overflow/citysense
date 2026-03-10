# Plan: LLM-Powered Citywide Insight Synthesis

## Context

The admin dashboard's "AI Quick Insights" card shows a top concern, trending topic, and sentiment %. Currently, per-article analysis produces isolated `urgent_concerns` and `topic_clusters` strings, and the frontend aggregates them with **exact-string frequency counting**. This is broken — 87 unique concern strings across 55 articles with near-zero exact overlap. Semantically similar concerns like "Traffic congestion at Atlanta Highway" and "Traffic near data center site" are counted as separate items. The "top concern" is effectively random.

**Fix:** Add one LLM synthesis call after per-article analysis that semantically groups concerns/topics and produces pre-computed citywide insights. Frontend reads the result directly instead of aggregating.

---

## Files to Change

| File | Action |
|------|--------|
| `backend/processors/schemas.py` | Add `ThemedConcern`, `TrendingTheme`, `CitywideInsights` models; add `citywide_insights` field to `AnalysisResults` |
| `backend/agents/prompts.py` | Add `CITYWIDE_SYNTHESIS_PROMPT` |
| `backend/processors/synthesize_insights.py` | **NEW** — synthesis logic + convenience wrapper |
| `backend/api/routers/analysis.py` | Replace `run_batch_analysis` with `run_analysis_with_synthesis` |
| `backend/core/scrape_scheduler.py` | Same replacement in `_run_comment_analysis()` |
| `frontend/src/components/app/admin/AIInsightsCard.tsx` | Delete client-side aggregation, read `citywide_insights` directly |

---

## Step 1: Schemas (`backend/processors/schemas.py`)

Add three new models:

```python
class ThemedConcern(BaseModel):
    theme: str              # "Road Safety & Infrastructure"
    concerns: list[str]     # original concern strings grouped here
    article_count: int      # how many articles contribute

class TrendingTheme(BaseModel):
    theme: str              # "Economic Development & Jobs"
    topics: list[str]       # original topic strings grouped here
    article_count: int

class CitywideInsights(BaseModel):
    top_concerns: list[ThemedConcern]           # 3-5
    trending_themes: list[TrendingTheme]        # 3-5
    mayoral_brief: str                          # 2-3 sentences
    top_recommendations: list[Recommendation]   # top 3 city-level
```

Add to `AnalysisResults`:
```python
citywide_insights: CitywideInsights | None = None
```

---

## Step 2: Synthesis Prompt (`backend/agents/prompts.py`)

Add `CITYWIDE_SYNTHESIS_PROMPT` — instructs Gemini to:
- Group semantically similar concerns into 3-5 themed clusters (with original strings for traceability)
- Group topics into 3-5 trending themes
- Write a 2-3 sentence mayoral brief (lead with most pressing pattern, cite numbers)
- Synthesize top 3 city-level recommendations from per-article recs

Key rule: group by **semantic meaning**, not string similarity. Fewer broader themes > many narrow ones.

---

## Step 3: New File (`backend/processors/synthesize_insights.py`)

~60 lines. Four functions:

1. `format_articles_for_synthesis(results) → str` — compact text block of all article summaries/concerns/topics (~6,700 tokens for 55 articles)
2. `build_synthesis_chain(llm) → Runnable` — prompt + `llm.with_structured_output(CitywideInsights)`
3. `synthesize_citywide_insights(results, llm) → CitywideInsights` — one async LLM call
4. `run_analysis_with_synthesis(articles, comments) → AnalysisResults` — convenience wrapper that runs `run_batch_analysis()` then `synthesize_citywide_insights()`, attaches result to `AnalysisResults.citywide_insights`

---

## Step 4: Wire into Backend

### `backend/api/routers/analysis.py`
In `_run_analysis()`: replace `run_batch_analysis()` import with `run_analysis_with_synthesis()`. Add status message "Synthesizing citywide insights...".

### `backend/core/scrape_scheduler.py`
In `_run_comment_analysis()`: replace `run_batch_analysis()` with `run_analysis_with_synthesis()` inside the `asyncio.run()` call.

---

## Step 5: Frontend (`AIInsightsCard.tsx`)

- Delete `rankByFrequency()`, `aggregateInsights()`, `AggregatedInsights` interface
- Add `CitywideInsights`, `ThemedConcern`, `TrendingTheme`, `Recommendation` interfaces
- Read `data.citywide_insights` directly from API response
- Render: mayoral brief → top concern (with article count) → trending theme → collapsible full analysis (themed concerns, trending themes, recommendations)
- Fallback: if `citywide_insights` is null, show "empty" state

---

## Verification

1. `python -c "from backend.processors.synthesize_insights import run_analysis_with_synthesis; print('OK')"`
2. `cd frontend && npx tsc --noEmit`
3. Hit "Analyze" on admin dashboard → check `analysis_results.json` has `citywide_insights` field → verify card shows themed concerns with article counts
