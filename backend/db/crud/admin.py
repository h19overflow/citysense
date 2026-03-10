"""CRUD operations for AdminProfile."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import (
    create_record,
    delete_record,
    get_record_by_field,
    list_records,
    update_record,
)
from backend.db.models import AdminProfile


async def create_admin(session: AsyncSession, **kwargs: Any) -> AdminProfile:
    return await create_record(session, AdminProfile, **kwargs)


async def get_admin_by_id(session: AsyncSession, admin_id: str) -> AdminProfile | None:
    return await get_record_by_field(session, AdminProfile, "id", admin_id)


async def get_admin_by_email(session: AsyncSession, email: str) -> AdminProfile | None:
    return await get_record_by_field(session, AdminProfile, "email", email)


async def list_admins(session: AsyncSession, skip: int = 0, limit: int = 100) -> list[AdminProfile]:
    return await list_records(session, AdminProfile, skip, limit)


async def update_admin(session: AsyncSession, admin_id: str, **kwargs: Any) -> AdminProfile | None:
    return await update_record(session, AdminProfile, admin_id, **kwargs)


async def delete_admin(session: AsyncSession, admin_id: str) -> bool:
    return await delete_record(session, AdminProfile, admin_id)
