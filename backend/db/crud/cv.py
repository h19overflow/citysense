"""CRUD operations for CV uploads and versions."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.db.crud.base import create_record, delete_record
from backend.db.models.cv_upload import CVUpload, CVVersion


async def create_cv_upload(
    session: AsyncSession, **kwargs: Any
) -> CVUpload:
    """Create a new CV upload record."""
    return await create_record(session, CVUpload, **kwargs)


async def get_cv_upload_with_versions(
    session: AsyncSession, upload_id: str
) -> CVUpload | None:
    """Fetch a CV upload with all its versions eagerly loaded."""
    stmt = (
        select(CVUpload)
        .where(CVUpload.id == upload_id)
        .options(selectinload(CVUpload.versions))
        .limit(1)
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def list_cv_uploads_by_citizen(
    session: AsyncSession,
    citizen_id: str,
    skip: int = 0,
    limit: int = 50,
) -> list[CVUpload]:
    """List all CV uploads for a citizen, newest first."""
    stmt = (
        select(CVUpload)
        .where(CVUpload.citizen_id == citizen_id)
        .order_by(CVUpload.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for record in records:
        session.expunge(record)
    return records


async def delete_cv_upload(
    session: AsyncSession, upload_id: str
) -> bool:
    """Delete a CV upload and all its versions (cascade)."""
    return await delete_record(session, CVUpload, upload_id)


async def create_cv_version(
    session: AsyncSession, **kwargs: Any
) -> CVVersion:
    """Create a new version snapshot for a CV upload."""
    return await create_record(session, CVVersion, **kwargs)


async def get_latest_cv_version(
    session: AsyncSession, cv_upload_id: str
) -> CVVersion | None:
    """Fetch the most recent version for a CV upload."""
    stmt = (
        select(CVVersion)
        .where(CVVersion.cv_upload_id == cv_upload_id)
        .order_by(CVVersion.version_number.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def get_next_version_number(
    session: AsyncSession, cv_upload_id: str
) -> int:
    """Return the next version number for a CV upload."""
    stmt = select(func.coalesce(func.max(CVVersion.version_number), 0)).where(
        CVVersion.cv_upload_id == cv_upload_id
    )
    result = await session.execute(stmt)
    current_max = result.scalar_one()
    return current_max + 1


async def find_version_by_hash(
    session: AsyncSession, cv_upload_id: str, content_hash: str
) -> CVVersion | None:
    """Check if a version with this hash already exists for the upload."""
    stmt = (
        select(CVVersion)
        .where(
            CVVersion.cv_upload_id == cv_upload_id,
            CVVersion.content_hash == content_hash,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def list_cv_versions(
    session: AsyncSession,
    cv_upload_id: str,
    skip: int = 0,
    limit: int = 50,
) -> list[CVVersion]:
    """List all versions for a CV upload, newest first."""
    stmt = (
        select(CVVersion)
        .where(CVVersion.cv_upload_id == cv_upload_id)
        .order_by(CVVersion.version_number.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for record in records:
        session.expunge(record)
    return records
