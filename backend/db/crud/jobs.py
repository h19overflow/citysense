"""CRUD operations for JobListing."""

from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import get_record_by_field, list_records
from backend.db.models import JobListing


async def upsert_job(session: AsyncSession, **kwargs: Any) -> None:
    stmt = pg_insert(JobListing).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_jobs(session: AsyncSession, jobs: list[dict]) -> int:
    """Upsert a batch of jobs in a single statement. Returns count."""
    if not jobs:
        return 0
    columns = {k for j in jobs for k in j.keys()}
    stmt = pg_insert(JobListing).values(jobs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={col: stmt.excluded[col] for col in columns if col != "id"},
    )
    await session.execute(stmt)
    await session.flush()
    return len(jobs)


async def get_job_by_id(session: AsyncSession, job_id: str) -> JobListing | None:
    return await get_record_by_field(session, JobListing, "id", job_id)


async def list_jobs(
    session: AsyncSession, skip: int = 0, limit: int = 500
) -> list[JobListing]:
    return await list_records(session, JobListing, skip, limit)


def job_to_geojson_feature(job: JobListing) -> dict | None:
    """Convert a JobListing row to a GeoJSON Feature dict."""
    if job.lat is None or job.lng is None:
        return None
    props = {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "source": job.source,
        "address": job.address,
        "url": job.url,
        "scraped_at": job.scraped_at.isoformat() if job.scraped_at else "",
        **(job.properties or {}),
    }
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [job.lng, job.lat]},
        "properties": props,
    }
