"""Tests for SSE broadcaster module."""

import asyncio
import json

import pytest

from backend.core.sse_broadcaster import (
    broadcast_event,
    create_client_queue,
    remove_client_queue,
    stream_events,
)


class TestCreateAndRemoveQueue:
    @pytest.mark.asyncio
    async def test_create_returns_queue(self):
        queue = create_client_queue()
        assert isinstance(queue, asyncio.Queue)
        remove_client_queue(queue)

    @pytest.mark.asyncio
    async def test_remove_discards_queue(self):
        queue = create_client_queue()
        remove_client_queue(queue)
        # Removing again should not raise
        remove_client_queue(queue)


class TestBroadcastEvent:
    @pytest.mark.asyncio
    async def test_broadcast_sends_to_queue(self):
        queue = create_client_queue()
        broadcast_event("test_type", {"key": "value"})
        payload = queue.get_nowait()
        parsed = json.loads(payload)
        assert parsed["type"] == "test_type"
        assert parsed["data"]["key"] == "value"
        remove_client_queue(queue)

    @pytest.mark.asyncio
    async def test_broadcast_sends_to_multiple_queues(self):
        q1 = create_client_queue()
        q2 = create_client_queue()
        broadcast_event("multi", [1, 2])
        assert not q1.empty()
        assert not q2.empty()
        remove_client_queue(q1)
        remove_client_queue(q2)

    @pytest.mark.asyncio
    async def test_broadcast_list_data(self):
        queue = create_client_queue()
        broadcast_event("list_event", [{"id": 1}, {"id": 2}])
        payload = json.loads(queue.get_nowait())
        assert payload["type"] == "list_event"
        assert len(payload["data"]) == 2
        remove_client_queue(queue)


class TestStreamEvents:
    @pytest.mark.asyncio
    async def test_stream_yields_sse_format(self):
        queue = create_client_queue()
        broadcast_event("ping", {"status": "ok"})

        chunks = []
        async for chunk in stream_events(queue):
            chunks.append(chunk)
            break  # Only read one message

        assert len(chunks) == 1
        assert chunks[0].startswith("data: ")
        assert chunks[0].endswith("\n\n")
        remove_client_queue(queue)
