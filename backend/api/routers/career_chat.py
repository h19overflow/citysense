"""Career follow-up chat endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from backend.agents.career.agent import handle_career_chat
from backend.api.schemas.career_schemas import CareerChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/career", tags=["career"])

# In-memory context store: context_id -> CareerAgentResponse dict
_context_store: dict[str, dict] = {}


@router.post("/chat")
async def chat(request: CareerChatRequest) -> dict:
    """Handle a follow-up career question using pre-computed career context."""
    context = _context_store.get(request.career_context_id, {})
    result = await handle_career_chat(
        message=request.message,
        context=context,
        history=[],
    )
    return result


def store_career_context(context_id: str, context: dict) -> None:
    """Save a career analysis result for later chat lookups."""
    _context_store[context_id] = context
