"""Read-only tools for the mayor chat agent.

Each tool reads from analysis_results.json and returns
formatted text the agent can use in its response.
"""

import json
from pathlib import Path

from backend.config import REPO_ROOT

ANALYSIS_PATH = REPO_ROOT / "backend" / "data" / "analysis_results.json"


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
    news_path = REPO_ROOT / "frontend" / "public" / "data" / "news_feed.json"
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
            recs = a.get("recommendations", [])
            recs_text = ""
            if recs:
                recs_lines = [f"  - [{r.get('priority', 'medium').upper()}] {r['action']} — {r.get('rationale', '')}" for r in recs]
                recs_text = f"\nRecommendations:\n" + "\n".join(recs_lines)

            return (
                f"Article: {article_id}\n"
                f"Sentiment: {a['article_sentiment']} (conf: {a['article_confidence']:.0%})\n"
                f"Summary: {a['admin_summary']}\n"
                f"Topic clusters: {', '.join(a.get('topic_clusters', []))}\n"
                f"Urgent concerns: {', '.join(a.get('urgent_concerns', []))}\n"
                f"Comments ({len(a.get('comments', []))}):\n" +
                "\n".join(comments_summary) + recs_text
            )
    return f"No analysis found for article {article_id}"
