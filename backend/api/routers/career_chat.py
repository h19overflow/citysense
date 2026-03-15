"""Career follow-up chat endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.career.agent import handle_career_chat, run_career_analysis
from backend.agents.career.growth_handler import handle_growth_chat
from backend.api.routers.roadmap_cache import ensure_cached, get_cached_path
from backend.api.schemas.career_schemas import CareerChatRequest
from backend.db.crud.citizen import get_citizen_by_id
from backend.db.crud.cv import list_cv_uploads_by_citizen, get_latest_cv_version
from backend.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/career", tags=["career"])

# In-memory context store: context_id -> CareerAgentResponse dict
_context_store: dict[str, dict] = {}


@router.post("/chat")
async def chat(request: CareerChatRequest) -> dict:
    """Handle a career or growth chat message.

    Branches on request.growth_mode:
    - Growth mode: uses active roadmap path context + growth agent
    - Career mode: uses pre-computed career analysis context
    """
    history = [
        HumanMessage(content=turn.content) if turn.role == "user" else AIMessage(content=turn.content)
        for turn in request.history
    ]

    if _is_growth_mode(request):
        return await _handle_growth_mode(request, history)

    return await _handle_career_mode(request, history)


def _is_growth_mode(request: CareerChatRequest) -> bool:
    """Check if the request is for Growth Guide mode."""
    return (
        request.growth_mode
        and request.active_roadmap_analysis_id is not None
        and request.active_roadmap_path_key is not None
    )


async def _handle_growth_mode(
    request: CareerChatRequest,
    history: list[HumanMessage | AIMessage],
) -> dict:
    """Route to the Growth Guide agent with cached path data."""
    await ensure_cached(request.active_roadmap_analysis_id)
    cached_path = get_cached_path(
        request.active_roadmap_analysis_id,
        request.active_roadmap_path_key,
    )
    return await handle_growth_chat(
        message=request.message,
        path_data=cached_path or {},
        path_key=request.active_roadmap_path_key,
        analysis_id=request.active_roadmap_analysis_id,
        citizen_id=request.citizen_id,
        discuss_context=request.discuss_context,
        history=history,
    )


async def _handle_career_mode(
    request: CareerChatRequest,
    history: list[HumanMessage | AIMessage],
) -> dict:
    """Route to the Career Guide agent with pre-computed context."""
    context = _context_store.get(request.career_context_id or "", {})
    if not context and request.citizen_id:
        context = await _resolve_context_from_db(request.citizen_id)

    return await handle_career_chat(
        message=request.message,
        context=context,
        history=history,
    )


async def _resolve_context_from_db(citizen_id: str) -> dict:
    """Load the citizen's latest CV from DB and build a lightweight context dict.

    Returns an empty dict if the citizen has no uploaded CV yet.
    """
    try:
        async with AsyncSessionLocal() as session:
            uploads = await list_cv_uploads_by_citizen(session, citizen_id, limit=1)
            if not uploads:
                return {}
            cv_version = await get_latest_cv_version(session, uploads[0].id)
            profile = await get_citizen_by_id(session, citizen_id)

        if not cv_version:
            return {}

        logger.info(
            "Chat context miss for citizen %s — running on-demand analysis",
            citizen_id,
        )
        result = await run_career_analysis(cv_version, profile)
        # Cache it so subsequent messages in the same session are instant
        _context_store[citizen_id] = result
        return result

    except Exception as e:
        logger.error("DB context fallback failed for citizen %s: %s", citizen_id, e)
        return {}


def store_career_context(context_id: str, context: dict) -> None:
    """Save a career analysis result for later chat lookups."""
    _context_store[context_id] = context
