"""Stateless helpers for NewsScraper — SERP parsing, text fetching, DB row mapping."""

import time
from collections.abc import Callable
from datetime import datetime, timezone

from backend.core.data_scraping.bright_data_client import fetch_with_unlocker


def parse_serp_results(
    make_id_fn: Callable[[str, str], str],
    body: dict,
    category: str,
) -> list[dict]:
    """Convert a raw SERP response body into a list of article dicts."""
    now = datetime.now(timezone.utc).isoformat()
    news_items = body.get("news") or body.get("organic") or body.get("results") or []
    articles: list[dict] = []

    for item in news_items:
        title = item.get("title", "")
        url = item.get("link") or item.get("url") or ""
        if not title or not url:
            continue
        articles.append({
            "id": make_id_fn(title, url),
            "title": title,
            "excerpt": item.get("snippet") or item.get("description") or "",
            "body": "",
            "source": item.get("source", ""),
            "sourceUrl": url,
            "imageUrl": item.get("thumbnail") or item.get("image") or None,
            "category": category,
            "publishedAt": item.get("date") or item.get("age") or "",
            "scrapedAt": now,
            "upvotes": 0,
            "downvotes": 0,
            "commentCount": 0,
        })
    return articles


def build_article(
    make_id_fn: Callable[[str, str], str],
    item: dict,
    now: str,
) -> dict:
    """Build a normalised article dict from a raw item, assigning an id if absent."""
    if "id" in item:
        return item
    title = item.get("title", "")
    url = item.get("sourceUrl") or item.get("link") or item.get("url") or ""
    return {
        "id": make_id_fn(title, url),
        "title": title,
        "excerpt": item.get("excerpt") or item.get("snippet") or "",
        "body": item.get("body", ""),
        "source": item.get("source", ""),
        "sourceUrl": url,
        "imageUrl": item.get("imageUrl") or item.get("thumbnail") or None,
        "category": item.get("category", "general"),
        "publishedAt": item.get("publishedAt") or item.get("date") or "",
        "scrapedAt": now,
        "upvotes": item.get("upvotes", 0),
        "downvotes": item.get("downvotes", 0),
        "commentCount": item.get("commentCount", 0),
    }


def fetch_full_text(articles: list[dict], max_articles: int = 20) -> list[dict]:
    """Fetch full body text for articles that have no body yet, mutating in place."""
    need_text = [a for a in articles if not a.get("body")][:max_articles]
    for article in need_text:
        url = article.get("sourceUrl", "")
        if not url:
            continue
        content = fetch_with_unlocker(url)
        if content:
            article["body"] = content[:2000]
        time.sleep(1)
    return articles


def article_to_row(article: dict) -> dict:
    """Convert a scraper article dict to a flat DB column dict."""
    scraped_raw = article.get("scrapedAt", "")
    try:
        scraped_at = datetime.fromisoformat(scraped_raw)
        if scraped_at.tzinfo is None:
            scraped_at = scraped_at.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        scraped_at = datetime.now(timezone.utc)

    return {
        "id": article["id"],
        "title": article.get("title", ""),
        "excerpt": article.get("excerpt", ""),
        "body": article.get("body", ""),
        "source": article.get("source", ""),
        "source_url": article.get("sourceUrl", ""),
        "image_url": article.get("imageUrl"),
        "category": article.get("category", "general"),
        "published_at": article.get("publishedAt", ""),
        "scraped_at": scraped_at,
        "upvotes": article.get("upvotes", 0),
        "downvotes": article.get("downvotes", 0),
        "comment_count": article.get("commentCount", 0),
        "sentiment": article.get("sentiment"),
        "sentiment_score": article.get("sentimentScore"),
        "misinfo_risk": article.get("misinfoRisk"),
        "summary": article.get("summary"),
        "location": article.get("location"),
        "reaction_counts": article.get("reactionCounts"),
    }
