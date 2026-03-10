"""Mayor chat endpoint with SSE streaming."""

import logging
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from backend.agents.mayor_chat import stream_mayor_response
from backend.core.exceptions import AppException

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@router.post("/chat")
async def mayor_chat(request: ChatRequest) -> EventSourceResponse:
    """Stream mayor chat agent response via SSE."""

    async def event_generator():
        try:
            async for event_type, data in stream_mayor_response(
                request.message, [m.model_dump() for m in request.history]
            ):
                yield {"event": event_type, "data": data}
            yield {"event": "done", "data": ""}
        except AppException as exc:
            logger.error(
                "Mayor chat domain error",
                extra={"code": exc.code, "message": exc.message},
            )
            yield {"event": "error", "data": exc.message}
        except (ValueError, TypeError) as exc:
            logger.error("Mayor chat invalid input", extra={"error": str(exc)})
            yield {"event": "error", "data": "Invalid request data."}
        except RuntimeError as exc:
            logger.error(
                "Mayor chat agent runtime error", extra={"error": str(exc)}
            )
            yield {"event": "error", "data": "Agent encountered an error. Please try again."}

    return EventSourceResponse(event_generator())
