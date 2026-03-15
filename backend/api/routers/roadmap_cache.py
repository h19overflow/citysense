"""In-memory cache for roadmap path data, keyed by analysis_id."""

import logging
from typing import Any

logger = logging.getLogger(__name__)

_cache: dict[str, dict[str, Any]] = {}


def get_cached_path(analysis_id: str, path_key: str) -> dict | None:
    """Read a single path from cache. Returns None on miss."""
    analysis_data = _cache.get(analysis_id)
    if not analysis_data:
        return None
    return analysis_data.get(f"path_{path_key}")


async def ensure_cached(analysis_id: str) -> None:
    """Load all 3 paths from DB into cache if not already present."""
    if analysis_id in _cache:
        return
    from backend.db.crud.growth import get_roadmap_analysis_by_id
    from backend.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        analysis = await get_roadmap_analysis_by_id(session, analysis_id)
    if not analysis:
        return
    _cache[analysis_id] = {
        "path_fill_gap": analysis.path_fill_gap,
        "path_multidisciplinary": analysis.path_multidisciplinary,
        "path_pivot": analysis.path_pivot,
        "citizen_id": analysis.citizen_id,
    }


def invalidate_cache(analysis_id: str) -> None:
    """Clear cache entry. Called after a successful write."""
    _cache.pop(analysis_id, None)
