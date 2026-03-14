"""In-process event bus for growth plan pipeline progress."""

import asyncio
from typing import Any

# intake_id -> asyncio.Queue of progress dicts
_queues: dict[str, asyncio.Queue[dict[str, Any] | None]] = {}


def create_progress_queue(intake_id: str) -> asyncio.Queue[dict[str, Any] | None]:
    """Create and register a progress queue for an intake run."""
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
    _queues[intake_id] = queue
    return queue


def get_progress_queue(intake_id: str) -> asyncio.Queue[dict[str, Any] | None] | None:
    """Return the queue for an intake_id, or None if not found."""
    return _queues.get(intake_id)


async def emit_progress(intake_id: str, stage: str, message: str, progress: int) -> None:
    """Push a progress event onto the intake's queue. No-op if queue not found."""
    queue = _queues.get(intake_id)
    if queue:
        await queue.put({"stage": stage, "message": message, "progress": progress})


async def close_progress_queue(intake_id: str, analysis_id: str) -> None:
    """Push a done event and sentinel None, then remove the queue."""
    queue = _queues.pop(intake_id, None)
    if queue:
        await queue.put({"stage": "done", "message": "Analysis complete", "progress": 100, "analysis_id": analysis_id})
        await queue.put(None)  # sentinel — SSE handler exits
