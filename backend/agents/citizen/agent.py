"""Citizen-facing civic assistant agent with structured output."""

import json
import logging
from collections import defaultdict
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.citizen.prompt import CITIZEN_CHAT_PROMPT
from backend.agents.citizen.schemas import CitizenAgentResponse
from backend.agents.citizen.tools.registry import CITIZEN_TOOLS
from backend.agents.common.llm import build_llm

logger = logging.getLogger(__name__)

_cached_agent = None

# In-memory conversation history: conversation_id -> list of messages
_history: dict[str, list[HumanMessage | AIMessage]] = defaultdict(list)
MAX_HISTORY_TURNS = 6  # Keep last 6 messages (3 user + 3 assistant)


def build_citizen_agent() -> object:
    """Return the cached citizen agent, building once on first call."""
    global _cached_agent
    if _cached_agent is not None:
        return _cached_agent
    llm = build_llm()
    _cached_agent = create_agent(
        model=llm,
        tools=CITIZEN_TOOLS,
        system_prompt=CITIZEN_CHAT_PROMPT,
        response_format=CitizenAgentResponse,
    )
    return _cached_agent


async def handle_citizen_chat(
    message: str,
    conversation_id: str | None = None,
) -> dict[str, Any]:
    """Invoke the citizen agent and return a structured response dict."""
    agent = build_citizen_agent()
    conv_id = conversation_id or "default"

    # Build message list: history + new message
    history = _history[conv_id][-MAX_HISTORY_TURNS:]
    messages = [*history, HumanMessage(content=message)]

    try:
        result = await agent.ainvoke({"messages": messages})
        response = _build_response(result)

        # Save user message and assistant reply to history
        _history[conv_id].append(HumanMessage(content=message))
        _history[conv_id].append(AIMessage(content=response["answer"]))

        # Trim history to prevent unbounded growth
        if len(_history[conv_id]) > MAX_HISTORY_TURNS * 2:
            _history[conv_id] = _history[conv_id][-MAX_HISTORY_TURNS:]

        return response
    except Exception as e:
        logger.error("Citizen agent error: %s", e)
        return _build_error_response(str(e))


def _build_response(result: dict[str, Any]) -> dict[str, Any]:
    """Build the API response from the agent result with structured output."""
    structured: CitizenAgentResponse | None = result.get("structured_response")
    messages = result.get("messages", [])
    map_commands = _extract_map_commands(messages)

    if structured:
        services = [s.model_dump() for s in structured.services]
        return _assemble_response(
            answer=structured.answer,
            source_items=services,
            chips=structured.chips or _default_chips(),
            map_commands=map_commands,
        )

    answer = _extract_final_answer(messages)
    return _assemble_response(
        answer=answer,
        source_items=[],
        chips=_default_chips(),
        map_commands=map_commands,
    )


def _assemble_response(
    answer: str,
    source_items: list[dict[str, Any]],
    chips: list[str],
    map_commands: list[dict[str, Any]],
) -> dict[str, Any]:
    """Assemble the final response dict matching the ChatResponse shape."""
    return {
        "intent": "find_service",
        "answer": answer,
        "confidence": 0.9,
        "extracted_entities": {},
        "follow_up_question": None,
        "suggested_actions": [],
        "source_items": source_items,
        "map_highlights": [],
        "map_commands": map_commands,
        "chips": chips,
        "answer_summary": None,
        "reasoning_notes": None,
        "warnings": [],
        "source_count": len(source_items),
    }


def _extract_final_answer(messages: list) -> str:
    """Get the text content of the last AI message (fallback)."""
    for msg in reversed(messages):
        content = getattr(msg, "content", "")
        if isinstance(content, str) and content.strip():
            if not getattr(msg, "tool_calls", None):
                return content.strip()
        if isinstance(content, list):
            text = "".join(
                p["text"] for p in content
                if isinstance(p, dict) and p.get("type") == "text"
            )
            if text.strip() and not getattr(msg, "tool_calls", None):
                return text.strip()
    return "I couldn't find an answer. Please try rephrasing your question."


def _extract_map_commands(messages: list) -> list[dict[str, Any]]:
    """Scan tool call results for MapCommand JSON objects."""
    commands: list[dict[str, Any]] = []
    for msg in messages:
        content = getattr(msg, "content", "")
        if not isinstance(content, str):
            continue
        try:
            data = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, dict) and data.get("type") in (
            "filter_category", "zoom_to", "highlight_hotspots", "clear",
        ):
            commands.append(data)
    return commands


def _default_chips() -> list[str]:
    return ["What services are available?", "Show me on the map", "How do I apply?"]


def _build_error_response(error_message: str) -> dict[str, Any]:
    """Return a graceful error response matching ChatResponse shape."""
    return _assemble_response(
        answer="I'm having trouble right now. Please try again.",
        source_items=[],
        chips=["Try again", "What can you help with?"],
        map_commands=[],
    ) | {"confidence": 0.0, "intent": "general", "warnings": [error_message]}
