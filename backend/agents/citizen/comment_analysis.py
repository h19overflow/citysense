"""Batch comment analysis using LangChain + Gemini structured output.

Reads news_feed.json + comments, runs per-article analysis via Gemini,
saves results to analysis_results.json.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from backend.config import OUTPUT_FILES, REPO_ROOT
from backend.core.data_scraping.schemas import ArticleAnalysis, AnalysisResults
from backend.agents.citizen.redact_pii import redact_comment_text
from backend.agents.mayor.prompt import BATCH_ANALYSIS_PROMPT

logger = logging.getLogger("agents.comment_analysis")

ANALYSIS_OUTPUT = REPO_ROOT / "backend" / "data" / "analysis_results.json"
METRICS_OUTPUT = REPO_ROOT / "backend" / "data" / "analysis_metrics.jsonl"
MODEL_NAME = "gemini-3.1-flash-lite-preview"
PROMPT_VERSION = "v1.0"


def build_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=0,
        max_output_tokens=8192,
    )


def _build_analysis_chain(llm: ChatGoogleGenerativeAI) -> Runnable:
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


def _format_comments_for_prompt(comments: list[dict]) -> str:
    lines = []
    for i, c in enumerate(comments, 1):
        redacted = redact_comment_text(c.get("content", ""))
        lines.append(f"{i}. [ID: {c['id']}] {redacted}")
    return "\n".join(lines) if lines else "(no comments)"


async def _analyze_single_article(
    chain, article: dict, comments: list[dict]
) -> ArticleAnalysis | None:
    """Run analysis chain on one article. Returns None on failure."""
    comments_text = _format_comments_for_prompt(comments)
    try:
        result: ArticleAnalysis = await chain.ainvoke({
            "article_title": article["title"],
            "article_excerpt": article.get("excerpt", ""),
            "comment_count": str(len(comments)),
            "comments_text": comments_text,
        })
        result.article_id = article["id"]
        return result
    except Exception as e:
        print(f"  Failed to analyze {article['id']}: {e}")
        return None


async def _analyze_and_track(
    chain, article: dict, article_comments: list[dict], semaphore: asyncio.Semaphore,
) -> tuple[ArticleAnalysis | None, int, float]:
    """Analyze one article under a concurrency semaphore. Returns (result, comment_count, elapsed)."""
    async with semaphore:
        print(f"  Analyzing: {article['title'][:60]}... ({len(article_comments)} comments)")
        start = time.time()
        result = await _analyze_single_article(chain, article, article_comments)
        elapsed = time.time() - start
        return result, len(article_comments), elapsed


MAX_CONCURRENCY = 10


async def run_batch_analysis(
    articles: list[dict],
    comments: list[dict],
) -> AnalysisResults:
    """Run parallel analysis on articles that have comments (up to 10 concurrent)."""
    llm = build_llm()
    chain = _build_analysis_chain(llm)
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    # Build tasks only for articles that have comments
    tasks = []
    for article in articles:
        article_comments = load_comments_for_article(article["id"], comments)
        if not article_comments:
            continue
        tasks.append(_analyze_and_track(chain, article, article_comments, semaphore))

    if not tasks:
        return AnalysisResults(
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            model_version=MODEL_NAME,
            prompt_version=PROMPT_VERSION,
            total_articles=0,
            total_comments=0,
            articles=[],
        )

    print(f"  Running {len(tasks)} analyses with concurrency={MAX_CONCURRENCY}")
    outcomes = await asyncio.gather(*tasks)

    results: list[ArticleAnalysis] = []
    total_comments = 0
    for result, comment_count, elapsed in outcomes:
        if result:
            results.append(result)
            total_comments += comment_count
            _log_metrics(result.article_id, comment_count, elapsed)

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


def _log_metrics(article_id: str, comment_count: int, latency: float) -> None:
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


def merge_community_sentiment(results: AnalysisResults) -> None:
    """Merge AI sentiment scores back into the news_feed.json file."""
    news_feed_path = OUTPUT_FILES.get("news")
    if not news_feed_path or not Path(news_feed_path).exists():
        print("merge_community_sentiment: news_feed.json not found, skipping")
        return

    feed = json.loads(Path(news_feed_path).read_text(encoding="utf-8"))
    articles = feed if isinstance(feed, list) else feed.get("articles", [])

    sentiment_map = {
        a.article_id: a.model_dump() for a in results.articles
    }

    for article in articles:
        analysis = sentiment_map.get(article.get("id"))
        if analysis:
            article["community_sentiment"] = {
                "overall_sentiment": analysis["overall_sentiment"],
                "sentiment_score": analysis["sentiment_score"],
                "top_concerns": analysis.get("top_concerns", []),
                "analyzed_at": results.analyzed_at,
            }

    Path(news_feed_path).write_text(
        json.dumps(feed, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Merged sentiment for {len(sentiment_map)} articles into news feed")


def run_comment_analysis_pipeline() -> None:
    """Full pipeline: load comments + articles → analyze → merge back."""
    from backend.api.routers.comments import COMMENTS_PATH

    if not COMMENTS_PATH.exists():
        return
    try:
        comments = json.loads(COMMENTS_PATH.read_text(encoding="utf-8")).get("comments", [])
    except (json.JSONDecodeError, KeyError):
        return

    if not comments:
        return

    news_path = OUTPUT_FILES["news"]
    if not news_path.exists():
        return
    articles = json.loads(news_path.read_text(encoding="utf-8")).get("articles", [])

    commented_ids = {c["articleId"] for c in comments}
    articles_with_comments = [a for a in articles if a["id"] in commented_ids]
    if not articles_with_comments:
        return

    logger.info("Analyzing %d articles with %d comments", len(articles_with_comments), len(comments))
    results = asyncio.run(run_batch_analysis(articles_with_comments, comments))
    save_analysis_results(results)
    merge_community_sentiment(results)
    logger.info("Comment analysis complete — %d articles analyzed", results.total_articles)
