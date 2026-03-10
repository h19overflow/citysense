"""Citizen AI chatbot and predictive analysis endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(tags=["citizen-chat"])


class CitizenChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    context: dict | None = None


@router.post("/citizen-chat")
async def citizen_chat(body: CitizenChatRequest) -> JSONResponse:
    """AI civic chatbot endpoint for citizen queries."""
    from backend.agents.citizen.agent import handle_citizen_chat

    response = await handle_citizen_chat(
        message=body.message,
        conversation_id=body.conversation_id,
    )
    return JSONResponse(response)


@router.get("/predictions/hotspots")
async def predictions_hotspots() -> JSONResponse:
    """Return civic hotspot predictions by neighborhood."""
    from backend.core.predictive.hotspot_scorer import compute_hotspots

    results = compute_hotspots()
    return JSONResponse({
        "hotspots": [r.to_dict() for r in results],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "weights": {
            "complaint_volume": 0.4,
            "complaint_growth_rate": 0.3,
            "event_density": 0.2,
            "negative_sentiment": 0.1,
        },
    })


@router.get("/predictions/trends")
async def predictions_trends() -> JSONResponse:
    """Return civic complaint trend analysis."""
    from backend.core.predictive.trend_detector import detect_trends

    results = detect_trends()
    return JSONResponse({
        "trends": [r.to_dict() for r in results],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
