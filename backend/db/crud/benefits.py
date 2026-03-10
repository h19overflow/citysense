"""CRUD operations for BenefitService."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import get_record_by_field, list_records
from backend.db.models import BenefitService


async def upsert_benefit(session: AsyncSession, **kwargs: Any) -> None:
    stmt = pg_insert(BenefitService).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_benefits(session: AsyncSession, services: list[dict]) -> int:
    """Upsert a batch of benefit services in a single statement. Returns count."""
    if not services:
        return 0
    columns = {k for s in services for k in s.keys()}
    stmt = pg_insert(BenefitService).values(services)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={col: stmt.excluded[col] for col in columns if col != "id"},
    )
    await session.execute(stmt)
    await session.flush()
    return len(services)


async def get_benefit_by_id(
    session: AsyncSession, benefit_id: str
) -> BenefitService | None:
    return await get_record_by_field(session, BenefitService, "id", benefit_id)


async def list_benefits(
    session: AsyncSession,
    category: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[BenefitService]:
    if category:
        stmt = (
            select(BenefitService)
            .where(BenefitService.category == category)
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(stmt)
        records = list(result.scalars().all())
        for r in records:
            session.expunge(r)
        return records
    return await list_records(session, BenefitService, skip, limit)
