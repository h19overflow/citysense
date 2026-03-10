"""CRUD operations for CitizenProfile."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import (
    create_record,
    delete_record,
    get_record_by_field,
    list_records,
    update_record,
)
from backend.db.models import CitizenProfile


async def create_citizen(session: AsyncSession, **kwargs: Any) -> CitizenProfile:
    return await create_record(session, CitizenProfile, **kwargs)


async def get_citizen_by_id(session: AsyncSession, citizen_id: str) -> CitizenProfile | None:
    return await get_record_by_field(session, CitizenProfile, "id", citizen_id)


async def get_citizen_by_email(session: AsyncSession, email: str) -> CitizenProfile | None:
    return await get_record_by_field(session, CitizenProfile, "email", email)


async def list_citizens(session: AsyncSession, skip: int = 0, limit: int = 100) -> list[CitizenProfile]:
    return await list_records(session, CitizenProfile, skip, limit)


async def update_citizen(session: AsyncSession, citizen_id: str, **kwargs: Any) -> CitizenProfile | None:
    return await update_record(session, CitizenProfile, citizen_id, **kwargs)


async def delete_citizen(session: AsyncSession, citizen_id: str) -> bool:
    return await delete_record(session, CitizenProfile, citizen_id)
