"""Housing endpoint: serve housing listings as GeoJSON."""

from fastapi import APIRouter

from backend.db.crud.housing import housing_to_geojson_feature, list_housing
from backend.db.session import get_session

router = APIRouter(tags=["housing"])


@router.get("/housing")
async def get_housing() -> dict:
    async with get_session() as session:
        listings = await list_housing(session)
    features = [f for f in (housing_to_geojson_feature(h) for h in listings) if f is not None]
    return {"type": "FeatureCollection", "features": features}
