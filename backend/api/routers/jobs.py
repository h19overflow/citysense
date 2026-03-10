"""Jobs endpoint: serve job listings as GeoJSON."""

from fastapi import APIRouter

from backend.db.crud.jobs import job_to_geojson_feature, list_jobs
from backend.db.session import get_session

router = APIRouter(tags=["jobs"])


@router.get("/jobs")
async def get_jobs() -> dict:
    async with get_session() as session:
        jobs = await list_jobs(session)
    features = [f for f in (job_to_geojson_feature(j) for j in jobs) if f is not None]
    return {"type": "FeatureCollection", "features": features}
