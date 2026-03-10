"""CRUD operations for HousingListing."""

from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud.base import get_record_by_field, list_records
from backend.db.models import HousingListing


async def upsert_housing(session: AsyncSession, **kwargs: Any) -> None:
    stmt = pg_insert(HousingListing).values(**kwargs)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={k: v for k, v in kwargs.items() if k != "id"},
    )
    await session.execute(stmt)


async def bulk_upsert_housing(session: AsyncSession, listings: list[dict]) -> int:
    """Upsert a batch of housing listings in a single statement. Returns count."""
    if not listings:
        return 0
    columns = {k for l in listings for k in l.keys()}
    stmt = pg_insert(HousingListing).values(listings)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={col: stmt.excluded[col] for col in columns if col != "id"},
    )
    await session.execute(stmt)
    await session.flush()
    return len(listings)


async def get_housing_by_id(
    session: AsyncSession, listing_id: str
) -> HousingListing | None:
    return await get_record_by_field(session, HousingListing, "id", listing_id)


async def list_housing(
    session: AsyncSession, skip: int = 0, limit: int = 500
) -> list[HousingListing]:
    return await list_records(session, HousingListing, skip, limit)


def housing_to_geojson_feature(listing: HousingListing) -> dict | None:
    """Convert a HousingListing row to a GeoJSON Feature dict."""
    if listing.lat is None or listing.lng is None:
        return None
    props = {
        "id": listing.id,
        "address": listing.address,
        "price": listing.price,
        "scraped_at": listing.scraped_at.isoformat() if listing.scraped_at else "",
        **(listing.properties or {}),
    }
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [listing.lng, listing.lat]},
        "properties": props,
    }
