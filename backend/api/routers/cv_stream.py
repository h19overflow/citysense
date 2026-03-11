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
    channel = f"cv_progress:{job_id}"
    logger.info("[SSE:%s] Subscriber thread started, subscribing to channel '%s'", job_id, channel)

    client = redis.from_url(redis_url, decode_responses=True)
    pubsub = client.pubsub()
    pubsub.subscribe(channel)
    logger.info("[SSE:%s] Subscribed to Redis channel '%s'", job_id, channel)

    messages_received = 0
    try:
        while not stop_event.is_set():
            raw_message = pubsub.get_message(timeout=1.0)
            if raw_message is None:
                continue
            logger.debug("[SSE:%s] Raw message type='%s'", job_id, raw_message.get("type"))
            if raw_message["type"] != "message":
                continue
            messages_received += 1
            payload = raw_message["data"]
            logger.info(
                "[SSE:%s] Message #%d received, forwarding to SSE queue: %s",
                job_id,
                messages_received,
                payload[:200],
            )
            asyncio.run_coroutine_threadsafe(queue.put(payload), loop)
            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                logger.warning("[SSE:%s] Could not parse message as JSON: %s", job_id, payload)
                continue
            status = event.get("status")
            if status in {"completed", "failed"}:
                logger.info("[SSE:%s] Terminal status '%s' received — stopping subscriber", job_id, status)
                break
        else:
            logger.info("[SSE:%s] stop_event was set — subscriber exiting", job_id)
    finally:
        logger.info(
            "[SSE:%s] Subscriber thread finishing. Total messages received: %d",
            job_id,
            messages_received,
        )
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
    logger.info("[SSE:%s] stream_job_events started", job_id)
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    stop_event = threading.Event()

    task = asyncio.create_task(
        asyncio.to_thread(subscribe_to_job_events, redis_url, job_id, queue, loop, stop_event)
    )

    events_sent = 0
    try:
        while True:
            logger.debug("[SSE:%s] Waiting for next event from queue...", job_id)
            payload = await queue.get()
            if payload is None:
                logger.info("[SSE:%s] Received sentinel — SSE stream closing. Total events sent: %d", job_id, events_sent)
                break
            events_sent += 1
            logger.info("[SSE:%s] Yielding SSE event #%d: %s", job_id, events_sent, payload[:200])
            yield f"data: {payload}\n\n"
    finally:
        logger.info("[SSE:%s] stream_job_events generator finalising, setting stop_event", job_id)
        stop_event.set()
        await task
