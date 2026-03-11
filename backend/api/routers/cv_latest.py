"""Endpoint for loading a citizen's latest CV analysis from the database."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from backend.db.crud.cv import get_latest_cv_version, list_cv_uploads_by_citizen
from backend.db.session import AsyncSessionLocal

router = APIRouter(prefix="/cv", tags=["cv"])


@router.get("/latest")
async def get_latest_cv_for_citizen(citizen_id: str) -> dict:
    """Return the most recent CV analysis for a citizen from the DB.

    Returns 204 if the citizen has no uploaded CV yet.
    """
    if not citizen_id:
        raise HTTPException(status_code=400, detail="citizen_id is required")

    async with AsyncSessionLocal() as session:
        uploads = await list_cv_uploads_by_citizen(session, citizen_id, limit=1)
        if not uploads:
            return Response(status_code=204)

        latest_upload = uploads[0]
        version = await get_latest_cv_version(session, latest_upload.id)
        if not version:
            return Response(status_code=204)

    return {
        "cv_upload_id": latest_upload.id,
        "file_name": latest_upload.file_name,
        "result": {
            "experience": version.experience or [],
            "projects": version.projects or [],
            "skills": version.skills or [],
            "soft_skills": version.soft_skills or [],
            "tools": version.tools or [],
            "roles": version.roles or [],
            "education": version.education or [],
            "summary": version.summary or "",
            "page_count": version.page_count,
        },
    }
