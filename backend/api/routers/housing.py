"""Housing endpoint: serve housing listings as GeoJSON."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.redis_client import cache
from backend.db.crud.housing import housing_to_geojson_feature, list_housing
from backend.db.session import get_db

router = APIRouter(tags=["housing"])


@router.get("/housing")
async def get_housing(
    session: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
) -> dict:
    cache_key = f"housing:list:{skip}:{limit}"
    cached = cache.fetch(cache_key)
    if cached:
        return cached

    listings = await list_housing(session, skip=skip, limit=limit)
    features = [f for f in (housing_to_geojson_feature(h) for h in listings) if f is not None]
    result = {"type": "FeatureCollection", "features": features}
    cache.store(cache_key, result, ttl=300)
    return result
