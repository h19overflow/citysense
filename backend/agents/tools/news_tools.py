"""Read-only tools for querying the live news feed.

Each tool reads from news_feed.json or exported_comments.json
and returns formatted text the agent can use in its response.
"""

import json
from pathlib import Path

from backend.config import REPO_ROOT

NEWS_FEED_PATH = REPO_ROOT / "frontend" / "public" / "data" / "news_feed.json"
COMMENTS_PATH = REPO_ROOT / "backend" / "data" / "exported_comments.json"


def _load_articles() -> list[dict]:
    if not NEWS_FEED_PATH.exists():
        return []
    return json.loads(NEWS_FEED_PATH.read_text()).get("articles", [])


def _load_comments() -> list[dict]:
    """Load comments from both exported_comments.json and news_feed.json, deduped by ID."""
    comments: list[dict] = []
    if COMMENTS_PATH.exists():
        comments.extend(json.loads(COMMENTS_PATH.read_text()).get("comments", []))
    if NEWS_FEED_PATH.exists():
        comments.extend(json.loads(NEWS_FEED_PATH.read_text()).get("comments", []))
    # Deduplicate by comment ID
    seen: set[str] = set()
    unique: list[dict] = []
    for c in comments:
        cid = c.get("id", "")
        if cid and cid not in seen:
            seen.add(cid)
            unique.append(c)
    return unique


def _score_engagement(article: dict) -> int:
    return article.get("upvotes", 0) + article.get("downvotes", 0) + article.get("commentCount", 0)


def _get_neighborhood(article: dict) -> str:
    return (article.get("location") or {}).get("neighborhood", "Unknown")


def get_trending_articles(limit: int = 5) -> str:
    """Get top articles ranked by total citizen engagement (upvotes + downvotes + comments)."""
    articles = _load_articles()
    if not articles:
        return "No news feed data available."

    ranked = sorted(articles, key=_score_engagement, reverse=True)
    lines = [f"Top {min(limit, len(ranked))} trending articles by engagement:"]
    for article in ranked[:limit]:
        engagement = _score_engagement(article)
        neighborhood = _get_neighborhood(article)
        lines.append(
            f"- [{article['category']}] {article['title']}\n"
            f"  Neighborhood: {neighborhood} | Engagement: {engagement} | "
            f"Sentiment: {article.get('sentiment', 'unknown')}"
        )
    return "\n".join(lines)


def search_news_by_topic(query: str) -> str:
    """Search articles by keyword across title, excerpt, and body (case-insensitive)."""
    articles = _load_articles()
    if not articles:
        return "No news feed data available."

    query_lower = query.lower()
    matches = [
        a for a in articles
        if query_lower in a.get("title", "").lower()
        or query_lower in a.get("excerpt", "").lower()
        or query_lower in a.get("body", "").lower()
    ]

    if not matches:
        return f"No articles found matching: {query}"

    lines = [f"Found {len(matches)} article(s) matching '{query}' (showing up to 10):"]
    for article in matches[:10]:
        excerpt_snippet = article.get("excerpt", "")[:100]
        lines.append(
            f"- [{article['category']}] {article['title']}\n"
            f"  Sentiment: {article.get('sentiment', 'unknown')} | {excerpt_snippet}..."
        )
    return "\n".join(lines)


def get_news_by_category(category: str) -> str:
    """Get article count, sentiment breakdown, and top titles for a news category."""
    articles = _load_articles()
    if not articles:
        return "No news feed data available."

    filtered = [a for a in articles if a.get("category", "").lower() == category.lower()]
    if not filtered:
        return f"No articles found for category: {category}"

    pos = sum(1 for a in filtered if a.get("sentiment") == "positive")
    neu = sum(1 for a in filtered if a.get("sentiment") == "neutral")
    neg = sum(1 for a in filtered if a.get("sentiment") == "negative")

    lines = [
        f"Category: {category} ({len(filtered)} articles)",
        f"Sentiment: positive={pos}, neutral={neu}, negative={neg}",
        "",
        "Top 5 titles:",
    ]
    for article in filtered[:5]:
        lines.append(f"- {article['title']}")
    return "\n".join(lines)


def _resolve_article_id(query: str) -> str | None:
    """Resolve an article ID from an ID string or partial title match."""
    articles = _load_articles()
    # Direct ID match
    for a in articles:
        if a["id"] == query:
            return a["id"]
    # Fuzzy title match
    query_lower = query.lower()
    for a in articles:
        if query_lower in a.get("title", "").lower():
            return a["id"]
    return None


def get_recent_comments(article_id: str | None = None, limit: int = 10) -> str:
    """Get recent citizen comments, optionally filtered to a specific article (by ID or title)."""
    comments = _load_comments()
    if not comments:
        return "No comment data available."

    resolved_id = None
    if article_id:
        resolved_id = _resolve_article_id(article_id)
        if not resolved_id:
            return f"No article found matching: {article_id}"
        comments = [c for c in comments if c.get("articleId") == resolved_id]
        if not comments:
            return f"No comments found for article: {article_id}"

    sorted_comments = sorted(comments, key=lambda c: c.get("createdAt", ""), reverse=True)
    label = f"article {resolved_id or article_id}" if article_id else "all articles"
    lines = [f"Recent {min(limit, len(sorted_comments))} comment(s) for {label}:"]
    for comment in sorted_comments[:limit]:
        content_preview = comment.get("content", "")[:120]
        lines.append(
            f"- [{comment.get('createdAt', 'unknown date')}] "
            f"Citizen on article {comment.get('articleId', '?')}: "
            f"{content_preview}..."
        )
    return "\n".join(lines)
