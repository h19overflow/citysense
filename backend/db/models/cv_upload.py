"""CV upload and version tracking models."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class CVUpload(Base):
    """Tracks each CV file uploaded by a citizen."""

    __tablename__ = "cv_uploads"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    citizen_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("citizen_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    versions: Mapped[list["CVVersion"]] = relationship(
        back_populates="cv_upload",
        order_by="CVVersion.version_number.desc()",
        cascade="all, delete-orphan",
    )


class CVVersion(Base):
    """Versioned analysis snapshot — one row per CV re-analysis."""

    __tablename__ = "cv_versions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    cv_upload_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("cv_uploads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    content_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, default="",
        comment="SHA-256 of serialized analysis — skips insert if duplicate",
    )
    experience: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    skills: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    soft_skills: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    tools: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    roles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    education: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cv_upload: Mapped["CVUpload"] = relationship(back_populates="versions")
