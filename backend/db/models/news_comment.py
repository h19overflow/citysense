"""NewsComment ORM model."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class NewsComment(Base):
    __tablename__ = "news_comments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    article_id: Mapped[str] = mapped_column(
        String(12), ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False
    )
    citizen_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("citizen_profiles.id", ondelete="CASCADE"), nullable=False
    )
    citizen_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_initials: Mapped[str] = mapped_column(String(5), nullable=False, default="")
    avatar_color: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_news_comments_article_id", "article_id"),
    )
