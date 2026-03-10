"""Generic base CRUD operations for any SQLAlchemy model."""

import logging
from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import Base

T = TypeVar("T", bound=Base)
logger = logging.getLogger(__name__)


async def create_record(
    session: AsyncSession, model: type[T], **kwargs: Any
) -> T:
    """Insert a new record, flush, refresh, and expunge."""
    try:
        record = model(**kwargs)
        session.add(record)
        await session.flush()
        await session.refresh(record)
        session.expunge(record)
        return record
    except IntegrityError:
        await session.rollback()
        logger.error("create_%s failed: integrity error", model.__tablename__)
        raise
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.error("create_%s failed: %s", model.__tablename__, exc)
        raise


async def get_record_by_field(
    session: AsyncSession, model: type[T], field_name: str, value: Any
) -> T | None:
    """Fetch a single record matching field == value."""
    column = getattr(model, field_name)
    stmt = select(model).where(column == value).limit(1)
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def list_records(
    session: AsyncSession, model: type[T], skip: int = 0, limit: int = 100
) -> list[T]:
    """Return a paginated list of records."""
    stmt = select(model).offset(skip).limit(limit)
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for record in records:
        session.expunge(record)
    return records


async def update_record(
    session: AsyncSession, model: type[T], record_id: str, **kwargs: Any
) -> T | None:
    """Update a record by primary key, using SELECT FOR UPDATE."""
    try:
        stmt = (
            select(model)
            .where(model.id == record_id)  # type: ignore[attr-defined]
            .limit(1)
            .with_for_update()
        )
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            return None
        for key, value in kwargs.items():
            setattr(record, key, value)
        await session.flush()
        await session.refresh(record)
        session.expunge(record)
        return record
    except IntegrityError:
        await session.rollback()
        logger.error("update_%s failed: integrity error", model.__tablename__)
        raise
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.error("update_%s failed: %s", model.__tablename__, exc)
        raise


async def delete_record(
    session: AsyncSession, model: type[T], record_id: str
) -> bool:
    """Delete a record by primary key. Returns True if deleted."""
    try:
        stmt = (
            select(model)
            .where(model.id == record_id)  # type: ignore[attr-defined]
            .limit(1)
        )
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            return False
        await session.delete(record)
        await session.flush()
        return True
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.error("delete_%s failed: %s", model.__tablename__, exc)
        raise
