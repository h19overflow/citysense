"""CRUD operations for CitizenProfile."""

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import CitizenProfile

logger = logging.getLogger(__name__)


async def create_citizen(session: AsyncSession, **kwargs: Any) -> CitizenProfile:
    try:
        citizen = CitizenProfile(**kwargs)
        session.add(citizen)
        await session.flush()
        await session.refresh(citizen)
        session.expunge(citizen)
        return citizen
    except IntegrityError:
        await session.rollback()
        logger.error("create_citizen failed: duplicate email", extra={"email": kwargs.get("email")})
        raise
    except Exception as exc:
        await session.rollback()
        logger.error("create_citizen failed", extra={"error": str(exc)})
        raise


async def get_citizen_by_id(session: AsyncSession, citizen_id: str) -> CitizenProfile | None:
    stmt = select(CitizenProfile).where(CitizenProfile.id == citizen_id).limit(1)
    result = await session.execute(stmt)
    citizen = result.scalar_one_or_none()
    if citizen:
        session.expunge(citizen)
    return citizen


async def get_citizen_by_email(session: AsyncSession, email: str) -> CitizenProfile | None:
    stmt = select(CitizenProfile).where(CitizenProfile.email == email).limit(1)
    result = await session.execute(stmt)
    citizen = result.scalar_one_or_none()
    if citizen:
        session.expunge(citizen)
    return citizen


async def list_citizens(
    session: AsyncSession, skip: int = 0, limit: int = 100
) -> list[CitizenProfile]:
    stmt = select(CitizenProfile).offset(skip).limit(limit)
    result = await session.execute(stmt)
    citizens = list(result.scalars().all())
    for citizen in citizens:
        session.expunge(citizen)
    return citizens


async def update_citizen(
    session: AsyncSession, citizen_id: str, **kwargs: Any
) -> CitizenProfile | None:
    try:
        stmt = (
            select(CitizenProfile)
            .where(CitizenProfile.id == citizen_id)
            .limit(1)
            .with_for_update()
        )
        result = await session.execute(stmt)
        citizen = result.scalar_one_or_none()
        if not citizen:
            return None
        for key, value in kwargs.items():
            setattr(citizen, key, value)
        await session.flush()
        await session.refresh(citizen)
        session.expunge(citizen)
        return citizen
    except IntegrityError:
        await session.rollback()
        logger.error("update_citizen failed: integrity error", extra={"citizen_id": citizen_id})
        raise
    except Exception as exc:
        await session.rollback()
        logger.error("update_citizen failed", extra={"citizen_id": citizen_id, "error": str(exc)})
        raise


async def delete_citizen(session: AsyncSession, citizen_id: str) -> bool:
    try:
        stmt = select(CitizenProfile).where(CitizenProfile.id == citizen_id).limit(1)
        result = await session.execute(stmt)
        citizen = result.scalar_one_or_none()
        if not citizen:
            return False
        await session.delete(citizen)
        await session.flush()
        return True
    except Exception as exc:
        await session.rollback()
        logger.error("delete_citizen failed", extra={"citizen_id": citizen_id, "error": str(exc)})
        raise
