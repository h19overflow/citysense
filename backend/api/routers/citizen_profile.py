"""Citizen profile endpoints — lookup and upsert by authenticated user email."""

from decimal import Decimal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.api.auth import ClerkUser
from backend.api.deps import get_current_user
from backend.db.crud import create_citizen, get_citizen_by_email, update_citizen
from backend.db.session import get_session

router = APIRouter(tags=["citizen-profile"])


class CitizenProfileUpdate(BaseModel):
    name: str
    job_title: str | None = None
    salary: float | None = None
    benefits: str | None = None
    marital_status: str | None = None


def _serialize_profile(profile) -> dict:
    """Convert a CitizenProfile ORM instance to a JSON-safe dict."""
    return {
        "id": str(profile.id),
        "email": profile.email,
        "name": profile.name,
        "job_title": profile.job_title,
        "salary": float(profile.salary) if isinstance(profile.salary, Decimal) else profile.salary,
        "benefits": profile.benefits,
        "marital_status": profile.marital_status,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


@router.get("/citizen/profile")
async def get_citizen_profile(
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return the citizen profile for the authenticated user, or signal that none exists."""
    if not user.email:
        return JSONResponse({"exists": False})

    async with get_session() as session:
        profile = await get_citizen_by_email(session, user.email)

    if not profile:
        return JSONResponse({"exists": False})

    return JSONResponse({"exists": True, "profile": _serialize_profile(profile)})


@router.put("/citizen/profile")
async def upsert_citizen_profile(
    body: CitizenProfileUpdate,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Create or update the citizen profile for the authenticated user."""
    if not user.email:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "NO_EMAIL", "message": "Token contains no email address", "details": {}}},
        )

    update_fields = body.model_dump(exclude_none=True)

    async with get_session() as session:
        existing = await get_citizen_by_email(session, user.email)

        if existing:
            profile = await update_citizen(session, existing.id, **update_fields)
        else:
            profile = await create_citizen(session, email=user.email, **update_fields)

    return JSONResponse(_serialize_profile(profile))
