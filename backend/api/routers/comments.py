"""Comments endpoints: serve and accept citizen comments."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.news import create_comment, list_all_comments, list_comments_by_article
from backend.db.models import NewsComment
from backend.db.session import get_db

router = APIRouter(tags=["comments"])


class CommentPayload(BaseModel):
    id: str
    articleId: str
    citizenId: str
    citizenName: str
    avatarInitials: str
    avatarColor: str
    content: str
    createdAt: str


def _comment_to_dict(comment: NewsComment) -> dict:
    """Convert NewsComment ORM object to frontend-compatible camelCase dict."""
    return {
        "id": comment.id,
        "articleId": comment.article_id,
        "citizenId": comment.citizen_id,
        "citizenName": comment.citizen_name,
        "avatarInitials": comment.avatar_initials,
        "avatarColor": comment.avatar_color,
        "content": comment.content,
        "createdAt": comment.created_at.isoformat() if comment.created_at else "",
    }


@router.get("/comments")
async def get_comments(
    session: AsyncSession = Depends(get_db),
    article_id: str | None = Query(None),
) -> dict:
    if article_id:
        comments = await list_comments_by_article(session, article_id)
    else:
        comments = await list_all_comments(session)
    return {"comments": [_comment_to_dict(c) for c in comments]}


@router.post("/comments", status_code=201)
async def post_comment(
    payload: CommentPayload,
    session: AsyncSession = Depends(get_db),
) -> dict:
    created_at = datetime.now(timezone.utc)
    try:
        created_at = datetime.fromisoformat(payload.createdAt)
    except (ValueError, TypeError):
        pass

    await create_comment(
        session,
        id=payload.id,
        article_id=payload.articleId,
        citizen_id=payload.citizenId,
        citizen_name=payload.citizenName,
        avatar_initials=payload.avatarInitials,
        avatar_color=payload.avatarColor,
        content=payload.content,
        created_at=created_at,
    )
    return {"status": "ok", "id": payload.id}
