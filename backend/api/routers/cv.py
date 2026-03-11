"""CV upload, job status, and SSE streaming endpoints."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from backend.api.routers.cv_stream import stream_job_events
from backend.api.schemas.cv_schemas import CVJobStatusResponse, CVUploadResponse
from backend.core.cv_pipeline import job_tracker, worker
from backend.core.redis_client import cache
from backend.db.crud.cv import create_cv_upload
from backend.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CV_UPLOAD_DIR = Path(__file__).resolve().parents[3] / "data" / "cv_uploads"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = [".pdf", ".docx"]

router = APIRouter(prefix="/cv", tags=["cv"])


def _resolve_upload_path(filename: str) -> Path:
    """Return a unique destination path inside the CV uploads directory."""
    CV_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(filename).suffix.lower()
    return CV_UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"


def _validate_file_type(filename: str) -> None:
    """Reject files that are not PDF or DOCX."""
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile,
    citizen_id: str = Form(...),
) -> CVUploadResponse:
    """Accept a CV file, persist it to disk and DB, then queue analysis."""
    _validate_file_type(file.filename or "")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

    destination = _resolve_upload_path(file.filename or "cv.pdf")
    await asyncio.to_thread(destination.write_bytes, contents)

    async with AsyncSessionLocal() as session:
        cv_upload = await create_cv_upload(
            session,
            citizen_id=citizen_id,
            file_name=file.filename or destination.name,
            file_url=str(destination),
        )
        await session.commit()
        cv_upload_id = cv_upload.id

    job = worker.create_job(
        citizen_id=citizen_id,
        cv_upload_id=cv_upload_id,
        file_path=str(destination),
    )
    await worker.submit_job(job)

    return CVUploadResponse(job_id=job.job_id, cv_upload_id=cv_upload_id)


@router.get("/jobs/{job_id}", response_model=CVJobStatusResponse)
async def get_job_status(job_id: str) -> CVJobStatusResponse:
    """Return the current state of a CV analysis job from Redis."""
    state = await job_tracker.load_job_state(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return CVJobStatusResponse(
        job_id=state.job_id,
        status=state.status,
        stage=state.status,
        progress_pct=job_tracker.compute_progress(
            state.status, state.analyzed_pages, state.total_pages or 1
        ),
        total_pages=state.total_pages or None,
        error=state.error or None,
        result=state.result.model_dump() if state.result else None,
    )


@router.get("/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str) -> StreamingResponse:
    """SSE endpoint — streams CV analysis progress events for a job."""
    is_available = await asyncio.to_thread(cache.is_available)
    if not is_available:
        raise HTTPException(status_code=503, detail="Redis unavailable")

    return StreamingResponse(
        stream_job_events(REDIS_URL, job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
