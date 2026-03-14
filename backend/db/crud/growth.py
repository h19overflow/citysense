"""CRUD operations for growth plan intakes and roadmap analyses."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import create_record, update_record
from backend.db.models.growth_plan import GrowthIntake, RoadmapAnalysis


async def create_growth_intake(
    session: AsyncSession, **kwargs: Any
) -> GrowthIntake:
    """Create a new growth intake record."""
    return await create_record(session, GrowthIntake, **kwargs)


async def get_growth_intake(
    session: AsyncSession, intake_id: str
) -> GrowthIntake | None:
    """Fetch a single growth intake by its primary key."""
    stmt = select(GrowthIntake).where(GrowthIntake.id == intake_id).limit(1)
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def update_growth_intake_crawl_data(
    session: AsyncSession,
    intake_id: str,
    crawl_strategies: list[Any],
    crawl_results: dict[str, Any],
) -> GrowthIntake | None:
    """Set crawl_strategies and crawl_results on an existing intake row."""
    return await update_record(
        session,
        GrowthIntake,
        intake_id,
        crawl_strategies=crawl_strategies,
        crawl_results=crawl_results,
    )


async def create_roadmap_analysis(
    session: AsyncSession, **kwargs: Any
) -> RoadmapAnalysis:
    """Create a new versioned roadmap analysis record."""
    return await create_record(session, RoadmapAnalysis, **kwargs)


async def get_latest_roadmap_analysis(
    session: AsyncSession, citizen_id: str
) -> RoadmapAnalysis | None:
    """Fetch the highest-version roadmap analysis for a citizen."""
    stmt = (
        select(RoadmapAnalysis)
        .where(RoadmapAnalysis.citizen_id == citizen_id)
        .order_by(RoadmapAnalysis.version_number.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def get_roadmap_analysis_by_id(
    session: AsyncSession, analysis_id: str
) -> RoadmapAnalysis | None:
    """Fetch a single roadmap analysis by its primary key."""
    stmt = (
        select(RoadmapAnalysis)
        .where(RoadmapAnalysis.id == analysis_id)
        .limit(1)
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def get_next_analysis_version_number(
    session: AsyncSession, citizen_id: str
) -> int:
    """Return max(version_number)+1 for this citizen, or 1 if none exist."""
    stmt = select(
        func.coalesce(func.max(RoadmapAnalysis.version_number), 0)
    ).where(RoadmapAnalysis.citizen_id == citizen_id)
    result = await session.execute(stmt)
    current_max = result.scalar_one()
    return current_max + 1


async def list_roadmap_analyses_by_citizen(
    session: AsyncSession,
    citizen_id: str,
    skip: int = 0,
    limit: int = 20,
) -> list[RoadmapAnalysis]:
    """List roadmap analyses for a citizen, newest version first."""
    stmt = (
        select(RoadmapAnalysis)
        .where(RoadmapAnalysis.citizen_id == citizen_id)
        .order_by(RoadmapAnalysis.version_number.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    records = list(result.scalars().all())
    for record in records:
        session.expunge(record)
    return records


async def get_latest_analysis_by_intake(
    session: AsyncSession, intake_id: str
) -> RoadmapAnalysis | None:
    """Fetch the most recent roadmap analysis for a given intake, or None."""
    stmt = (
        select(RoadmapAnalysis)
        .where(RoadmapAnalysis.intake_id == intake_id)
        .order_by(RoadmapAnalysis.version_number.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record:
        session.expunge(record)
    return record


async def update_roadmap_analysis_answers(
    session: AsyncSession,
    analysis_id: str,
    gap_answers: dict[str, Any],
) -> RoadmapAnalysis | None:
    """Set gap_answers on an existing roadmap analysis row."""
    return await update_record(
        session,
        RoadmapAnalysis,
        analysis_id,
        gap_answers=gap_answers,
    )
