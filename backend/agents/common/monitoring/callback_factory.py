"""Callback factory — creates Langfuse-aware LangChain callback handlers.

HOW LANGCHAIN + LANGFUSE TRACING WORKS (v2 SDK)
────────────────────────────────────────────────
Langfuse v2 uses OpenTelemetry under the hood. There are two parts:

1. **CallbackHandler** — a LangChain callback that captures chain/LLM events
   and converts them into Langfuse spans. You pass it via config:

       chain.ainvoke({"input": "..."}, config={"callbacks": [handler]})

2. **propagate_attributes** — a context manager that tags ALL spans created
   inside it with metadata (user_id, session_id, trace_name, tags).
   This is how we attach agent identity and user context to traces:

       with propagate_attributes(trace_name="mayor", user_id="u-123"):
           result = await chain.ainvoke(input, config={"callbacks": [handler]})

WHY BOTH?
─────────
- CallbackHandler captures the events (what happened)
- propagate_attributes tags them (who did it, for whom)

Together they give you fully attributed traces in the Langfuse dashboard.

CALLBACK FLOW
─────────────
    build_langfuse_config("mayor", user_id="u-123")
      ├─ Langfuse available?
      │    ├─ Create CallbackHandler()
      │    ├─ Build config = {"callbacks": [handler]}
      │    └─ Build attrs = {trace_name, user_id, session_id, tags}
      └─ Langfuse missing?
           └─ Return empty config + None attrs → agents run untraced
"""

import logging
from contextlib import contextmanager, nullcontext
from typing import Any

from backend.agents.common.monitoring.langfuse_client import get_langfuse

logger = logging.getLogger(__name__)


def create_callback_handler(
    agent_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> Any | None:
    """Create a Langfuse CallbackHandler for LangChain tracing.

    Returns None if Langfuse is not configured — callers should
    handle this by simply not passing callbacks.

    Args:
        agent_name: Identifies which agent is running (becomes trace name).
        user_id: Optional citizen/user ID for per-user trace filtering.
        session_id: Optional session ID to group related traces.
        tags: Optional list of tags for filtering in Langfuse dashboard.
        metadata: Optional extra metadata to attach to the trace.
    """
    client = get_langfuse()
    if client is None:
        return None

    # ── Import only when Langfuse is available ──
    # CallbackHandler() with no args uses the default Langfuse client
    # (auto-initialized from env vars). Metadata is set via propagate_attributes.
    from langfuse.langchain import CallbackHandler

    handler = CallbackHandler()
    logger.debug("Created callback handler for agent=%s", agent_name)
    return handler


def build_langfuse_config(
    agent_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a LangChain config dict with Langfuse callbacks included.

    This is the main helper agents should use. Returns a config dict
    that can be passed directly to chain.ainvoke() or agent.ainvoke():

        config = build_langfuse_config(agent_name="mayor")
        result = await chain.ainvoke({"input": "..."}, config=config)

    If Langfuse is not configured, returns an empty config dict —
    the chain still works, just without tracing.
    """
    handler = create_callback_handler(
        agent_name=agent_name,
        user_id=user_id,
        session_id=session_id,
        tags=tags,
        metadata=metadata,
    )

    if handler is None:
        return {}

    # ── Config includes both the callback and metadata ──
    # The metadata dict uses langfuse_ prefixed keys which the
    # CallbackHandler recognizes and attaches to the trace.
    config: dict[str, Any] = {"callbacks": [handler]}

    # ── Set trace-level metadata via config metadata ──
    # Langfuse CallbackHandler reads these prefixed keys from config
    trace_metadata: dict[str, Any] = {}
    if user_id:
        trace_metadata["langfuse_user_id"] = user_id
    if session_id:
        trace_metadata["langfuse_session_id"] = session_id
    if tags:
        trace_metadata["langfuse_tags"] = tags
    if metadata:
        trace_metadata["langfuse_metadata"] = metadata

    if trace_metadata:
        config["metadata"] = trace_metadata

    return config


def langfuse_trace_context(
    agent_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
):
    """Return a context manager that propagates trace attributes.

    Use this to wrap agent invocations so all spans get tagged:

        with langfuse_trace_context("mayor", user_id="u-123"):
            result = await chain.ainvoke(input, config=config)

    Returns a no-op context manager if Langfuse is not configured.
    """
    client = get_langfuse()
    if client is None:
        return nullcontext()

    from langfuse import propagate_attributes

    return propagate_attributes(
        trace_name=agent_name,
        user_id=user_id,
        session_id=session_id,
        tags=tags or [],
    )
