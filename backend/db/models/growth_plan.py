"""Growth plan intake and versioned roadmap analysis models."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class GrowthIntake(Base):
    """Stores intake form submission + crawl results for one growth plan session."""

    __tablename__ = "growth_intakes"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    citizen_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("citizen_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    career_goal: Mapped[str] = mapped_column(Text, nullable=False)
    target_timeline: Mapped[str] = mapped_column(String(100), nullable=False)
    learning_style: Mapped[str] = mapped_column(String(100), nullable=False)
    current_frustrations: Mapped[str] = mapped_column(Text, nullable=False)
    external_links: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    crawl_strategies: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    crawl_results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    analyses: Mapped[list["RoadmapAnalysis"]] = relationship(
        back_populates="intake",
        cascade="all, delete-orphan",
    )


class RoadmapAnalysis(Base):
    """Versioned roadmap analysis — one row per run (preliminary or final)."""

    __tablename__ = "roadmap_analyses"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    citizen_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("citizen_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    intake_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("growth_intakes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    gap_questions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    gap_answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    path_fill_gap: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    path_multidisciplinary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    path_pivot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    diff_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    intake: Mapped["GrowthIntake"] = relationship(back_populates="analyses")

    __table_args__ = (
        CheckConstraint("stage IN ('preliminary', 'final')", name="ck_roadmap_analyses_stage"),
    )
