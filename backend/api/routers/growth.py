"""Growth plan endpoints — intake, gap answers, roadmap retrieval, and diff."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.api.auth import ClerkUser
from backend.api.deps import get_current_user
from backend.api.schemas.growth_schemas import GapAnswersRequest, GrowthIntakeRequest
from backend.core.exceptions import NotFoundError
from backend.core.growth_service import (
    compute_roadmap_diff,
    get_latest_roadmap,
    get_roadmap_history,
    process_gap_answers,
    process_growth_intake,
)
from backend.db.crud.citizen import get_citizen_by_email
from backend.db.crud.cv import get_latest_cv_version, list_cv_uploads_by_citizen
from backend.db.session import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/growth", tags=["growth"])


async def _resolve_citizen_id(user: ClerkUser) -> str | None:
    """Return the citizen profile ID for the authenticated user, or None if not found."""
    if not user.email:
        return None
    async with get_session() as session:
        profile = await get_citizen_by_email(session, user.email)
    return str(profile.id) if profile else None


async def _get_cv_data(citizen_id: str) -> dict[str, Any]:
    """Load the citizen's latest CV version and return it as a plain dict."""
    async with get_session() as session:
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


@router.post("/intake")
async def submit_growth_intake(
    body: GrowthIntakeRequest,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Run intake pipeline: persist form, crawl signals, and preliminary analysis."""
    citizen_id = await _resolve_citizen_id(user)
    if not citizen_id:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "CITIZEN_NOT_FOUND", "message": "Citizen profile not found", "details": {}}},
        )
    cv_data = await _get_cv_data(citizen_id)
    async with get_session() as session:
        result = await process_growth_intake(session, citizen_id, body.model_dump(), cv_data)
    return JSONResponse(result)


@router.post("/roadmap/answers")
async def submit_gap_answers(
    body: GapAnswersRequest,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Persist gap answers and run final roadmap analysis."""
    citizen_id = await _resolve_citizen_id(user)
    if not citizen_id:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "CITIZEN_NOT_FOUND", "message": "Citizen profile not found", "details": {}}},
        )
    cv_data = await _get_cv_data(citizen_id)
    async with get_session() as session:
        result = await process_gap_answers(
            session, citizen_id, body.preliminary_analysis_id, body.gap_answers, cv_data
        )
    return JSONResponse(result)


@router.get("/roadmap/latest")
async def fetch_latest_roadmap(
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return the most recent roadmap analysis for the authenticated citizen."""
    citizen_id = await _resolve_citizen_id(user)
    if not citizen_id:
        return JSONResponse({"has_roadmap": False, "roadmap": None})
    async with get_session() as session:
        roadmap = await get_latest_roadmap(session, citizen_id)
    return JSONResponse({"has_roadmap": roadmap is not None, "roadmap": roadmap})


@router.get("/roadmap/history")
async def fetch_roadmap_history(
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return all roadmap analysis versions for the authenticated citizen, newest first."""
    citizen_id = await _resolve_citizen_id(user)
    if not citizen_id:
        return JSONResponse({"versions": [], "count": 0})
    async with get_session() as session:
        versions = await get_roadmap_history(session, citizen_id)
    return JSONResponse({"versions": versions, "count": len(versions)})


@router.get("/roadmap/{analysis_id_1}/{analysis_id_2}/diff")
async def fetch_roadmap_diff(
    analysis_id_1: str,
    analysis_id_2: str,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return diff narrative and side-by-side paths between two analysis versions."""
    try:
        async with get_session() as session:
            result = await compute_roadmap_diff(session, analysis_id_1, analysis_id_2)
        return JSONResponse(result)
    except NotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details or {}}},
        )
