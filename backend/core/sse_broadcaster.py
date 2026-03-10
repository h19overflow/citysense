"""In-memory SSE broadcaster for pushing live data to connected clients.

Maintains a set of asyncio.Queue instances — one per connected client.
When data arrives via webhook, broadcast_event pushes to all queues.
"""

import asyncio
import json
from collections.abc import AsyncGenerator

_client_queues: set[asyncio.Queue] = set()
_event_loop: asyncio.AbstractEventLoop | None = None


def create_client_queue() -> asyncio.Queue:
    """Register a new client and return its queue.

    Captures the running event loop so thread-safe broadcasts can use it.
    Must be called from an async context.
    """
    global _event_loop
    _event_loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    _client_queues.add(queue)
    return queue


def remove_client_queue(queue: asyncio.Queue) -> None:
    """Unregister a client queue."""
    _client_queues.discard(queue)


def broadcast_event(event_type: str, data: list | dict) -> None:
    """Push a JSON event to all connected clients (async context only)."""
    payload = json.dumps({"type": event_type, "data": data})
    for queue in _client_queues:
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass  # drop for slow clients


def broadcast_event_threadsafe(event_type: str, data: list | dict) -> None:
    """Push a JSON event from a non-async thread (thread-safe).

    Uses call_soon_threadsafe so the put_nowait runs on the event loop thread,
    not the calling thread. Call this from ThreadPoolExecutor workers.
    """
    if _event_loop is None or not _event_loop.is_running():
        return  # no clients connected yet, nothing to broadcast
    payload = json.dumps({"type": event_type, "data": data})

    def _put_to_all_queues() -> None:
        for queue in _client_queues:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # drop for slow clients

    _event_loop.call_soon_threadsafe(_put_to_all_queues)


async def stream_events(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    """Async generator yielding SSE-formatted messages from a client queue."""
    while True:
        payload = await queue.get()
        yield f"data: {payload}\n\n"
