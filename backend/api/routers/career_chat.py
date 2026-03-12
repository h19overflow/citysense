"""Career follow-up chat endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.career.agent import handle_career_chat, run_career_analysis
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
    """Handle a follow-up career question using pre-computed career context.

    Context resolution order:
    1. In-memory store keyed by career_context_id (set after /analyze completes)
    2. DB fallback: load citizen's latest CV + run analysis on-demand
    3. Empty context: agent tells user to upload their CV
    """
    context = _context_store.get(request.career_context_id or "", {})

    if not context and request.citizen_id:
        context = await _resolve_context_from_db(request.citizen_id)

    history = [
        HumanMessage(content=turn.content) if turn.role == "user" else AIMessage(content=turn.content)
        for turn in request.history
    ]
    result = await handle_career_chat(
        message=request.message,
        context=context,
        history=history,
    )
    return result


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
