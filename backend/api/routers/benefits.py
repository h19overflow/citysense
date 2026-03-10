"""Benefits endpoint: serve government benefit services."""

from fastapi import APIRouter, Query

from backend.db.crud.benefits import list_benefits
from backend.db.session import get_session

router = APIRouter(tags=["benefits"])


def _benefit_to_dict(svc) -> dict:
    """Convert BenefitService ORM object to frontend-compatible dict."""
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
        "income_limits": details.get("income_limits", {}),
        "url": svc.url,
        "phone": svc.phone,
        "scraped_at": svc.scraped_at.isoformat() if svc.scraped_at else "",
    }


@router.get("/benefits")
async def get_benefits(
    category: str | None = Query(None),
) -> dict:
    async with get_session() as session:
        services = await list_benefits(session, category=category)
    return {
        "total_services": len(services),
        "services": [_benefit_to_dict(s) for s in services],
    }
