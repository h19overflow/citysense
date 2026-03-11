"""CV upload, job status, and SSE streaming endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from pathlib import Path

import redis
from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from backend.api.schemas.cv_schemas import CVJobStatusResponse, CVUploadResponse
from backend.core.cv_pipeline import job_tracker, worker
from backend.db.crud.cv import create_cv_upload
from backend.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CV_UPLOAD_DIR = Path("backend/data/cv_uploads")

router = APIRouter(prefix="/cv", tags=["cv"])


def _resolve_upload_path(filename: str) -> Path:
    """Return a unique destination path inside the CV uploads directory."""
    CV_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(filename).suffix
    return CV_UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"


async def _save_uploaded_file(upload: UploadFile, destination: Path) -> None:
    """Write the uploaded file bytes to disk."""
    contents = await upload.read()
    destination.write_bytes(contents)


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile,
    citizen_id: str = Form(...),
) -> CVUploadResponse:
    """Accept a CV file, persist it to disk and DB, then queue analysis."""
    destination = _resolve_upload_path(file.filename or "cv")
    await _save_uploaded_file(file, destination)

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
        error=state.error,
        result=state.result.model_dump() if state.result else None,
    )


def _subscribe_and_feed_queue(
    job_id: str,
    queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
) -> None:
    """Blocking Redis pub/sub loop — runs in a thread via asyncio.to_thread."""
    client = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = client.pubsub()
    pubsub.subscribe(f"cv_progress:{job_id}")

    try:
        for raw_message in pubsub.listen():
            if raw_message["type"] != "message":
                continue
            payload = raw_message["data"]
            asyncio.run_coroutine_threadsafe(queue.put(payload), loop)
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                continue
            if event.get("status") in {"completed", "failed"}:
                break
    finally:
        pubsub.unsubscribe()
        client.close()
        asyncio.run_coroutine_threadsafe(queue.put(None), loop)


async def _stream_job_events(job_id: str):
    """Async generator that yields SSE-formatted events from Redis pub/sub."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    asyncio.create_task(
        asyncio.to_thread(_subscribe_and_feed_queue, job_id, queue, loop)
    )

    while True:
        payload = await queue.get()
        if payload is None:
            break
        yield f"data: {payload}\n\n"


@router.get("/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str) -> StreamingResponse:
    """SSE endpoint — streams CV analysis progress events for a job."""
    try:
        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        client.close()
    except redis.RedisError as exc:
        logger.warning("Redis unavailable for SSE stream: %s", exc)
        raise HTTPException(status_code=503, detail="Redis unavailable")

    return StreamingResponse(
        _stream_job_events(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
