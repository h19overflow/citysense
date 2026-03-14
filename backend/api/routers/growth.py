"""Growth plan endpoints — intake, gap answers, roadmap retrieval, and diff."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse

from backend.api.auth import ClerkUser
from backend.api.deps import get_current_user
from backend.api.schemas.growth_schemas import GapAnswersRequest, GrowthIntakeRequest
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


async def _resolve_citizen_id(session: Any, user: ClerkUser) -> str | None:
    """Return the citizen profile ID for the authenticated user, or None if not found."""
    if not user.email:
        return None
    profile = await get_citizen_by_email(session, user.email)
    return str(profile.id) if profile else None


async def _get_cv_data(session: Any, citizen_id: str) -> dict[str, Any]:
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


@router.post("/intake")
async def submit_growth_intake(
    body: GrowthIntakeRequest,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Run intake pipeline: persist form, crawl signals, and preliminary analysis."""
    async with get_session() as session:
        citizen_id = await _resolve_citizen_id(session, user)
        if not citizen_id:
            logger.warning("Growth intake rejected — citizen not found", extra={"email": user.email})
            return JSONResponse(
                status_code=404,
                content={"code": "CITIZEN_NOT_FOUND", "message": "Citizen profile not found", "details": {}},
            )
        cv_data = await _get_cv_data(session, citizen_id)
        result = await process_growth_intake(session, citizen_id, body.model_dump(mode="json"), cv_data)
    logger.info("Growth intake completed", extra={"citizen_id": citizen_id})
    return JSONResponse(result)


@router.post("/roadmap/answers")
async def submit_gap_answers(
    body: GapAnswersRequest,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Persist gap answers and run final roadmap analysis."""
    async with get_session() as session:
        citizen_id = await _resolve_citizen_id(session, user)
        if not citizen_id:
            logger.warning("Gap answers rejected — citizen not found", extra={"email": user.email})
            return JSONResponse(
                status_code=404,
                content={"code": "CITIZEN_NOT_FOUND", "message": "Citizen profile not found", "details": {}},
            )
        cv_data = await _get_cv_data(session, citizen_id)
        result = await process_gap_answers(
            session, citizen_id, body.preliminary_analysis_id, body.gap_answers, cv_data
        )
    logger.info("Gap answers processed", extra={"citizen_id": citizen_id})
    return JSONResponse(result)


@router.get("/roadmap/latest")
async def fetch_latest_roadmap(
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return the most recent roadmap analysis for the authenticated citizen."""
    async with get_session() as session:
        citizen_id = await _resolve_citizen_id(session, user)
        if not citizen_id:
            return JSONResponse({"has_roadmap": False, "roadmap": None})
        roadmap = await get_latest_roadmap(session, citizen_id)
    return JSONResponse({"has_roadmap": roadmap is not None, "roadmap": roadmap})


@router.get("/roadmap/history")
async def fetch_roadmap_history(
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return all roadmap analysis versions for the authenticated citizen, newest first."""
    async with get_session() as session:
        citizen_id = await _resolve_citizen_id(session, user)
        if not citizen_id:
            return JSONResponse({"versions": [], "count": 0})
        versions = await get_roadmap_history(session, citizen_id)
    return JSONResponse({"versions": versions, "count": len(versions)})


@router.get("/intake/{intake_id}/status")
async def stream_intake_progress(
    intake_id: str,
    user: ClerkUser = Depends(get_current_user),
) -> StreamingResponse:
    """SSE stream for crawl + analysis progress for a given intake run."""
    from backend.core.growth_progress import get_progress_queue

    async def event_generator():
        # Poll briefly — queue may not exist yet if SSE opens before intake starts
        for _ in range(20):
            queue = get_progress_queue(intake_id)
            if queue:
                break
            await asyncio.sleep(0.1)

        queue = get_progress_queue(intake_id)
        if not queue:
            yield f"data: {json.dumps({'stage': 'done', 'progress': 100})}\n\n"
            return

        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/roadmap/{analysis_id_1}/{analysis_id_2}/diff")
async def fetch_roadmap_diff(
    analysis_id_1: str,
    analysis_id_2: str,
    user: ClerkUser = Depends(get_current_user),
) -> JSONResponse:
    """Return diff narrative and side-by-side paths between two analysis versions."""
    async with get_session() as session:
        citizen_id = await _resolve_citizen_id(session, user)
        if not citizen_id:
            return JSONResponse(
                status_code=404,
                content={"code": "CITIZEN_NOT_FOUND", "message": "Citizen profile not found", "details": {}},
            )
        result = await compute_roadmap_diff(session, citizen_id, analysis_id_1, analysis_id_2)
    return JSONResponse(result)
