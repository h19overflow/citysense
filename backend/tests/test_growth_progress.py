"""Tests for the growth plan SSE progress event bus."""

import asyncio

import pytest

from backend.core.growth_progress import (
    _queues,
    close_progress_queue,
    create_progress_queue,
    emit_progress,
    get_progress_queue,
)


def _cleanup(*intake_ids: str) -> None:
    """Remove test intake_ids from the module-level registry."""
    for intake_id in intake_ids:
        _queues.pop(intake_id, None)


@pytest.mark.asyncio
async def test_create_progress_queue_registers_queue() -> None:
    intake_id = "test-create-001"
    try:
        queue = create_progress_queue(intake_id)
        assert queue is not None
        assert isinstance(queue, asyncio.Queue)
        assert get_progress_queue(intake_id) is queue
    finally:
        _cleanup(intake_id)


@pytest.mark.asyncio
async def test_get_progress_queue_returns_none_for_unknown_id() -> None:
    result = get_progress_queue("nonexistent-id-xyz")
    assert result is None


@pytest.mark.asyncio
async def test_get_progress_queue_returns_registered_queue() -> None:
    intake_id = "test-get-001"
    try:
        queue = create_progress_queue(intake_id)
        retrieved = get_progress_queue(intake_id)
        assert retrieved is queue
    finally:
        _cleanup(intake_id)


@pytest.mark.asyncio
async def test_emit_progress_puts_event_on_queue() -> None:
    intake_id = "test-emit-001"
    try:
        create_progress_queue(intake_id)
        await emit_progress(intake_id, "crawling", "Reading links…", 30)

        queue = get_progress_queue(intake_id)
        assert queue is not None
        event = queue.get_nowait()
        assert event == {"stage": "crawling", "message": "Reading links…", "progress": 30}
    finally:
        _cleanup(intake_id)


@pytest.mark.asyncio
async def test_emit_progress_is_noop_when_queue_missing() -> None:
    # Should not raise even if no queue exists for this id
    await emit_progress("no-queue-id-abc", "crawling", "Reading links…", 30)
    assert get_progress_queue("no-queue-id-abc") is None


@pytest.mark.asyncio
async def test_close_progress_queue_sends_done_event_and_sentinel() -> None:
    intake_id = "test-close-001"
    create_progress_queue(intake_id)

    await close_progress_queue(intake_id, "analysis-999")

    # Queue is removed from registry after close
    assert get_progress_queue(intake_id) is None


@pytest.mark.asyncio
async def test_close_progress_queue_is_noop_when_already_gone() -> None:
    # Calling close on a nonexistent queue should not raise
    await close_progress_queue("ghost-id-xyz", "analysis-000")


@pytest.mark.asyncio
async def test_full_happy_path_create_emit_close_drain() -> None:
    intake_id = "test-full-001"
    create_progress_queue(intake_id)

    await emit_progress(intake_id, "starting", "Starting…", 5)
    await emit_progress(intake_id, "strategizing", "Planning…", 10)
    await emit_progress(intake_id, "crawling", "Reading 2 link(s)…", 30)
    await emit_progress(intake_id, "aggregating", "Combining signals…", 60)
    await emit_progress(intake_id, "analyzing", "Building paths…", 75)
    await emit_progress(intake_id, "persisting", "Saving roadmap…", 95)

    # Grab the queue before close removes it
    queue = get_progress_queue(intake_id)
    assert queue is not None

    await close_progress_queue(intake_id, "analysis-final-001")

    # Drain all events from the queue
    events: list[dict | None] = []
    while not queue.empty():
        events.append(queue.get_nowait())

    # Last two items: done event + None sentinel
    assert events[-1] is None
    done_event = events[-2]
    assert done_event is not None
    assert done_event["stage"] == "done"
    assert done_event["progress"] == 100
    assert done_event["analysis_id"] == "analysis-final-001"
    assert done_event["message"] == "Analysis complete"

    # First 6 events are the emitted progress steps in order
    stages = [e["stage"] for e in events[:-2]]  # type: ignore[index]
    assert stages == ["starting", "strategizing", "crawling", "aggregating", "analyzing", "persisting"]

    # Confirm queue is no longer registered
    assert get_progress_queue(intake_id) is None
