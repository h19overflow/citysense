"""Backward-compat re-export. Real implementation in mayor/agent.py."""

from backend.agents.mayor.agent import (
    build_mayor_agent,
    stream_mayor_response,
    format_chat_history,
    extract_tool_call_name,
    extract_message_text,
)

__all__ = [
    "build_mayor_agent",
    "stream_mayor_response",
    "format_chat_history",
    "extract_tool_call_name",
    "extract_message_text",
]
