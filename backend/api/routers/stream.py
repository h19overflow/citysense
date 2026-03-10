"""SSE endpoint for live data updates."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.core.sse_broadcaster import (
    create_client_queue,
    remove_client_queue,
    stream_events,
)

router = APIRouter(tags=["stream"])


@router.get("/stream")
async def sse_stream() -> StreamingResponse:
    """SSE endpoint — clients connect here for live data updates."""
    queue = create_client_queue()

    async def event_generator():
        try:
            async for chunk in stream_events(queue):
                yield chunk
        finally:
            remove_client_queue(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
