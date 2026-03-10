"""Benefits endpoint: serve government benefit services."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.redis_client import cache
from backend.db.crud.benefits import list_benefits
from backend.db.models import BenefitService
from backend.db.session import get_db

router = APIRouter(tags=["benefits"])


def _benefit_to_dict(svc: BenefitService) -> dict:
    """Convert BenefitService ORM object to frontend-compatible dict.

    Matches the RawServiceGuide interface in govServices.ts (snake_case keys).
    """
    details = svc.details or {}
    return {
        "id": svc.id,
        "category": svc.category,
        "title": svc.title,
        "provider": svc.provider,
        "description": svc.description,
        "eligibility": details.get("eligibility", []),
        "how_to_apply": details.get("how_to_apply", []),
        "documents_needed": details.get("documents_needed", []),
        "income_limits": details.get("income_limits", []),
        "url": svc.url,
        "phone": svc.phone,
        "address": "",
        "tags": [],
        "scraped_at": svc.scraped_at.isoformat() if svc.scraped_at else "",
    }


@router.get("/benefits")
async def get_benefits(
    session: AsyncSession = Depends(get_db),
    category: str | None = Query(None),
) -> dict:
    cache_key = f"benefits:list:{category}"
    cached = cache.fetch(cache_key)
    if cached:
        return cached

    services = await list_benefits(session, category=category)
    result = {"services": [_benefit_to_dict(s) for s in services]}
    cache.store(cache_key, result, ttl=300)
    return result
