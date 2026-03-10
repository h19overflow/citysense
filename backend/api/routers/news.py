"""News endpoints: list and detail for news articles."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.redis_client import cache
from backend.db.crud.news import count_articles, get_article_by_id, list_articles
from backend.db.models import NewsArticle
from backend.db.session import get_db

router = APIRouter(tags=["news"])


def _article_to_dict(article: NewsArticle) -> dict:
    """Convert NewsArticle ORM object to frontend-compatible camelCase dict."""
    return {
        "id": article.id,
        "title": article.title,
        "excerpt": article.excerpt,
        "body": article.body,
        "source": article.source,
        "sourceUrl": article.source_url,
        "imageUrl": article.image_url,
        "category": article.category,
        "publishedAt": article.published_at,
        "scrapedAt": article.scraped_at.isoformat() if article.scraped_at else "",
        "upvotes": article.upvotes,
        "downvotes": article.downvotes,
        "commentCount": article.comment_count,
        "sentiment": article.sentiment,
        "sentimentScore": article.sentiment_score,
        "misinfoRisk": article.misinfo_risk,
        "summary": article.summary,
        "location": article.location,
        "reactionCounts": article.reaction_counts,
    }


@router.get("/news")
async def get_news(
    session: AsyncSession = Depends(get_db),
    category: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    cache_key = f"news:list:{category}:{skip}:{limit}"
    cached = cache.fetch(cache_key)
    if cached:
        return cached

    articles = await list_articles(session, category=category, skip=skip, limit=limit)
    total = await count_articles(session, category=category)
    result = {
        "totalArticles": total,
        "articles": [_article_to_dict(a) for a in articles],
    }
    cache.store(cache_key, result, ttl=300)
    return result


@router.get("/news/{article_id}")
async def get_news_detail(
    article_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    cache_key = f"news:detail:{article_id}"
    cached = cache.fetch(cache_key)
    if cached:
        return cached

    article = await get_article_by_id(session, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    result = _article_to_dict(article)
    cache.store(cache_key, result, ttl=600)
    return result
