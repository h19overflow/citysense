"""Jobs endpoint: serve job listings as GeoJSON."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.jobs import job_to_geojson_feature, list_jobs
from backend.db.session import get_db

router = APIRouter(tags=["jobs"])


@router.get("/jobs")
async def get_jobs(
    session: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
) -> dict:
    jobs = await list_jobs(session, skip=skip, limit=limit)
    features = [f for f in (job_to_geojson_feature(j) for j in jobs) if f is not None]
    return {"type": "FeatureCollection", "features": features}
