"""CRUD operations for AdminProfile."""

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import AdminProfile

logger = logging.getLogger(__name__)


async def create_admin(session: AsyncSession, **kwargs: Any) -> AdminProfile:
    try:
        admin = AdminProfile(**kwargs)
        session.add(admin)
        await session.flush()
        await session.refresh(admin)
        session.expunge(admin)
        return admin
    except IntegrityError:
        await session.rollback()
        logger.error("create_admin failed: duplicate email", extra={"email": kwargs.get("email")})
        raise
    except Exception as exc:
        await session.rollback()
        logger.error("create_admin failed", extra={"error": str(exc)})
        raise


async def get_admin_by_id(session: AsyncSession, admin_id: str) -> AdminProfile | None:
    stmt = select(AdminProfile).where(AdminProfile.id == admin_id).limit(1)
    result = await session.execute(stmt)
    admin = result.scalar_one_or_none()
    if admin:
        session.expunge(admin)
    return admin


async def get_admin_by_email(session: AsyncSession, email: str) -> AdminProfile | None:
    stmt = select(AdminProfile).where(AdminProfile.email == email).limit(1)
    result = await session.execute(stmt)
    admin = result.scalar_one_or_none()
    if admin:
        session.expunge(admin)
    return admin


async def list_admins(
    session: AsyncSession, skip: int = 0, limit: int = 100
) -> list[AdminProfile]:
    stmt = select(AdminProfile).offset(skip).limit(limit)
    result = await session.execute(stmt)
    admins = list(result.scalars().all())
    for admin in admins:
        session.expunge(admin)
    return admins


async def update_admin(
    session: AsyncSession, admin_id: str, **kwargs: Any
) -> AdminProfile | None:
    try:
        stmt = (
            select(AdminProfile)
            .where(AdminProfile.id == admin_id)
            .limit(1)
            .with_for_update()
        )
        result = await session.execute(stmt)
        admin = result.scalar_one_or_none()
        if not admin:
            return None
        for key, value in kwargs.items():
            setattr(admin, key, value)
        await session.flush()
        await session.refresh(admin)
        session.expunge(admin)
        return admin
    except IntegrityError:
        await session.rollback()
        logger.error("update_admin failed: integrity error", extra={"admin_id": admin_id})
        raise
    except Exception as exc:
        await session.rollback()
        logger.error("update_admin failed", extra={"admin_id": admin_id, "error": str(exc)})
        raise


async def delete_admin(session: AsyncSession, admin_id: str) -> bool:
    try:
        stmt = select(AdminProfile).where(AdminProfile.id == admin_id).limit(1)
        result = await session.execute(stmt)
        admin = result.scalar_one_or_none()
        if not admin:
            return False
        await session.delete(admin)
        await session.flush()
        return True
    except Exception as exc:
        await session.rollback()
        logger.error("delete_admin failed", extra={"admin_id": admin_id, "error": str(exc)})
        raise
