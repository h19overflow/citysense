"""Shared dependencies for growth plan router."""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import ClerkUser
from backend.db.crud.citizen import get_citizen_by_email
from backend.db.crud.cv import get_latest_cv_version, list_cv_uploads_by_citizen

logger = logging.getLogger(__name__)


async def resolve_citizen_id(session: AsyncSession, user: ClerkUser) -> str | None:
    """Return the citizen profile ID for the authenticated user, or None if not found."""
    if not user.email:
        return None
    profile = await get_citizen_by_email(session, user.email)
    return str(profile.id) if profile else None


async def get_cv_data(session: AsyncSession, citizen_id: str) -> dict[str, Any]:
    """Load the citizen's latest CV version and return it as a plain dict."""
    uploads = await list_cv_uploads_by_citizen(session, citizen_id, limit=1)
    if not uploads:
        return {}
    version = await get_latest_cv_version(session, uploads[0].id)
    if not version:
        return {}
    return {
        "skills": version.skills or [],
        "tools": version.tools or [],
        "roles": version.roles or [],
        "experience": version.experience or [],
        "education": version.education or [],
        "summary": version.summary or "",
    }
