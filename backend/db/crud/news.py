"""CRUD operations for NewsArticle and NewsComment."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import create_record, delete_record, get_record_by_field, list_records
from backend.db.models import NewsArticle, NewsComment


async def upsert_article(session: AsyncSession, **kwargs: Any) -> None:
    """Insert or update a news article by ID."""
    stmt = pg_insert(NewsArticle).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_articles(session: AsyncSession, articles: list[dict]) -> int:
    """Upsert a batch of articles. Returns count."""
    for article in articles:
        await upsert_article(session, **article)
    await session.flush()
    return len(articles)


async def get_article_by_id(
    session: AsyncSession, article_id: str
) -> NewsArticle | None:
    return await get_record_by_field(session, NewsArticle, "id", article_id)


async def list_articles(
    session: AsyncSession,
    category: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[NewsArticle]:
    """List articles, optionally filtered by category."""
    stmt = select(NewsArticle)
    if category and category != "all":
        stmt = stmt.where(NewsArticle.category == category)
    stmt = stmt.order_by(NewsArticle.scraped_at.desc()).offset(skip).limit(limit)
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for r in records:
        session.expunge(r)
    return records


async def count_articles(session: AsyncSession, category: str | None = None) -> int:
    stmt = select(func.count(NewsArticle.id))
    if category and category != "all":
        stmt = stmt.where(NewsArticle.category == category)
    result = await session.execute(stmt)
    return result.scalar_one()


async def create_comment(session: AsyncSession, **kwargs: Any) -> NewsComment:
    return await create_record(session, NewsComment, **kwargs)


async def list_comments_by_article(
    session: AsyncSession, article_id: str
) -> list[NewsComment]:
    stmt = (
        select(NewsComment)
        .where(NewsComment.article_id == article_id)
        .order_by(NewsComment.created_at.asc())
    )
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for r in records:
        session.expunge(r)
    return records


async def list_all_comments(
    session: AsyncSession, skip: int = 0, limit: int = 200
) -> list[NewsComment]:
    return await list_records(session, NewsComment, skip, limit)


async def delete_comment(session: AsyncSession, comment_id: str) -> bool:
    return await delete_record(session, NewsComment, comment_id)
