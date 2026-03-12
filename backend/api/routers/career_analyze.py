"""Career analysis endpoint: triggers analysis and streams progress via SSE."""

from __future__ import annotations

import json
import logging
import os
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse

from backend.api.routers.career_chat import store_career_context
from backend.api.routers.cv_stream import stream_job_events
from backend.api.schemas.career_schemas import CareerAnalyzeRequest, CareerAnalyzeResponse
from backend.db.crud.citizen import get_citizen_by_id
from backend.db.crud.cv import get_latest_cv_version
from backend.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CHANNEL_PREFIX = "career_progress"

router = APIRouter(prefix="/career", tags=["career"])


@router.post("/analyze", response_model=CareerAnalyzeResponse)
async def start_career_analysis(
    request: CareerAnalyzeRequest,
    background_tasks: BackgroundTasks,
) -> CareerAnalyzeResponse:
    """Queue a proactive career analysis for the given CV upload."""
    job_id = str(uuid.uuid4())
    background_tasks.add_task(
        _run_analysis_task,
        job_id=job_id,
        cv_upload_id=request.cv_version_id,
        citizen_id=request.citizen_id,
    )
    return CareerAnalyzeResponse(job_id=job_id)


@router.get("/jobs/{job_id}/stream")
async def stream_career_analysis(job_id: str) -> StreamingResponse:
    """SSE endpoint — streams career analysis progress and final result."""
    return StreamingResponse(
        stream_job_events(REDIS_URL, job_id, channel_prefix=CHANNEL_PREFIX),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _run_analysis_task(
    job_id: str,
    cv_upload_id: str,
    citizen_id: str,
) -> None:
    """Background task: load CV + profile, run agent, publish SSE events."""
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    channel = f"{CHANNEL_PREFIX}:{job_id}"

    async def publish(status: str, stage: str, progress: int, result: dict | None = None) -> None:
        event: dict = {"job_id": job_id, "status": status, "stage": stage, "progress_pct": progress}
        if result:
            event["result"] = result
        await redis_client.publish(channel, json.dumps(event))

    try:
        await publish("running", "Loading your career profile...", 10)
        async with AsyncSessionLocal() as session:
            cv_version = await get_latest_cv_version(session, cv_upload_id)
            profile = await get_citizen_by_id(session, citizen_id)

        if not cv_version:
            await publish("failed", "CV not found", 0)
            return

        await publish("running", "Searching Montgomery job listings...", 30)
        await publish("running", "Scanning web for opportunities...", 50)
        await publish("running", "Computing skill gaps...", 70)
        await publish("running", "Finding local training resources...", 85)

        from backend.agents.career.agent import run_career_analysis
        result = await run_career_analysis(cv_version, profile)

        store_career_context(job_id, result)
        await publish("completed", "Analysis complete", 100, result=result)

    except Exception as e:
        logger.error("Career analysis task error detail for job %s: %s", job_id, e)
        await publish("failed", "Analysis failed. Please try again.", 0)
    finally:
        await redis_client.aclose()
