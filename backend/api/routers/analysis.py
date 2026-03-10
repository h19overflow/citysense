"""Analysis endpoints: trigger batch, get results, get status."""

import json

from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.config import OUTPUT_FILES, REPO_ROOT
from backend.processors.analyze_comments import run_batch_analysis, save_analysis_results
from backend.processors.process_news import merge_community_sentiment_into_news_feed

router = APIRouter(tags=["analysis"])

ANALYSIS_PATH = REPO_ROOT / "backend" / "data" / "analysis_results.json"
_status = {"state": "idle", "message": ""}


def _resolve_news_path() -> tuple[object, list[str]]:
    candidates = [
        OUTPUT_FILES["news"],
        REPO_ROOT / "backend" / "data" / "news_feed.json",
    ]
    for path in candidates:
        if path.exists():
            return path, [str(p) for p in candidates]
    return candidates[0], [str(p) for p in candidates]


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
        news_path, searched_paths = _resolve_news_path()
        if not news_path.exists():
            _status.update(
                state="failed",
                message=f"No news_feed.json found. Searched: {', '.join(searched_paths)}",
            )
            return

        news_data = json.loads(news_path.read_text())
        articles = news_data.get("articles", [])

        comments_path = REPO_ROOT / "backend" / "data" / "exported_comments.json"
        comments = []
        if comments_path.exists():
            exported = json.loads(comments_path.read_text())
            comments = exported.get("comments", [])

        if not comments:
            _status.update(state="failed", message="No comments to analyze")
            return

        # Only analyze articles that have comments
        commented_ids = {c["articleId"] for c in comments}
        articles_with_comments = [a for a in articles if a["id"] in commented_ids]
        if not articles_with_comments:
            _status.update(state="failed", message="No articles with comments to analyze")
            return

        _status["message"] = f"Analyzing {len(articles_with_comments)} articles with comments..."
        results = await run_batch_analysis(articles_with_comments, comments)
        save_analysis_results(results)
        merge_community_sentiment_into_news_feed(results)
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
