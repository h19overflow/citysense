"""SSE streaming helpers for CV job progress via Redis pub/sub."""

from __future__ import annotations

import asyncio
import json
import logging
import threading
from collections.abc import AsyncGenerator

import redis

logger = logging.getLogger(__name__)


def subscribe_to_job_events(
    redis_url: str,
    job_id: str,
    queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    stop_event: threading.Event,
) -> None:
    """Blocking Redis pub/sub loop — runs in a thread via asyncio.to_thread.

    Listens on cv_progress:{job_id} and feeds payloads into an asyncio.Queue.
    Stops when a completed/failed event arrives or stop_event is set.
    """
    client = redis.from_url(redis_url, decode_responses=True)
    pubsub = client.pubsub()
    pubsub.subscribe(f"cv_progress:{job_id}")

    try:
        while not stop_event.is_set():
            raw_message = pubsub.get_message(timeout=1.0)
            if raw_message is None or raw_message["type"] != "message":
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


async def stream_job_events(
    redis_url: str,
    job_id: str,
) -> AsyncGenerator[str, None]:
    """Async generator yielding SSE-formatted events from Redis pub/sub.

    Cleans up the subscriber thread on client disconnect via stop_event.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    stop_event = threading.Event()

    task = asyncio.create_task(
        asyncio.to_thread(subscribe_to_job_events, redis_url, job_id, queue, loop, stop_event)
    )

    try:
        while True:
            payload = await queue.get()
            if payload is None:
                break
            yield f"data: {payload}\n\n"
    finally:
        stop_event.set()
        await task
