"""Growth Guide chat handler — builds ephemeral agent per request."""

import logging
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.career.prompt import GROWTH_GUIDE_PROMPT
from backend.agents.career.schemas import CareerAgentResponse
from backend.agents.career.tools.registry import build_growth_tools
from backend.agents.common.llm import build_llm

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 6


async def handle_growth_chat(
    message: str,
    path_data: dict[str, Any],
    path_key: str,
    analysis_id: str,
    citizen_id: str,
    discuss_context: str | None,
    history: list[HumanMessage | AIMessage],
) -> dict[str, Any]:
    """Handle a Growth Guide chat message.

    Builds a fresh agent per request (tool has analysis_id in closure).
    Returns CareerAgentResponse dict, optionally with updated_path.
    """
    llm = build_llm()
    tools = build_growth_tools(analysis_id, path_key, citizen_id)
    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=GROWTH_GUIDE_PROMPT,
        response_format=CareerAgentResponse,
    )

    context_prefix = _build_growth_context_prefix(path_data, path_key, discuss_context)
    messages = [
        HumanMessage(content=context_prefix),
        *history[-MAX_HISTORY_TURNS:],
        HumanMessage(content=message),
    ]

    try:
        result = await agent.ainvoke({"messages": messages})
        response = _extract_growth_response(result)
        if _was_tool_called(result):
            updated_path = await _read_updated_path(analysis_id, path_key)
            if updated_path:
                response["updated_path"] = updated_path
        return response
    except (ValueError, RuntimeError) as e:
        logger.error("Growth chat failed: %s", str(e))
        return _build_growth_error_response(str(e))


def _build_growth_context_prefix(
    path_data: dict[str, Any],
    path_key: str,
    discuss_context: str | None,
) -> str:
    """Build the context prefix injected as first message for the growth agent."""
    if not path_data:
        return "[No active growth path found]\nAsk the user to select a path first."

    steps_text = _format_skill_steps(path_data.get("skill_steps", []))

    prefix = (
        f"## ACTIVE GROWTH PATH ({path_key})\n"
        f"Title: {path_data.get('title', '?')}\n"
        f"Target role: {path_data.get('target_role', '?')}\n"
        f"Timeline: {path_data.get('timeline_estimate', '?')}\n"
        f"Unfair advantage: {path_data.get('unfair_advantage', '?')}\n\n"
        f"Skill steps:\n{steps_text}\n"
    )

    if discuss_context:
        prefix += f"\n## USER WANTS TO DISCUSS\n{discuss_context}\n"
        prefix += "Address this directly and offer constructive suggestions.\n"

    return prefix


def _format_skill_steps(skill_steps: list[dict[str, Any]]) -> str:
    """Format skill steps into a numbered text block."""
    lines: list[str] = []
    for i, step in enumerate(skill_steps):
        lines.append(f"  {i+1}. {step.get('skill', '?')} — {step.get('why', '')}")
        lines.append(f"     Resource: {step.get('resource', '')} ({step.get('resource_type', '')})")
    return "\n".join(lines)


def _extract_growth_response(result: dict[str, Any]) -> dict[str, Any]:
    """Extract CareerAgentResponse from the agent result dict."""
    structured = result.get("structured_response")
    if structured:
        return structured.model_dump()
    return _build_growth_error_response("Agent returned no structured response.")


def _was_tool_called(result: dict[str, Any]) -> bool:
    """Check if any tool was called during the agent's execution."""
    messages = result.get("messages", [])
    for msg in messages:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            return True
    return False


async def _read_updated_path(analysis_id: str, path_key: str) -> dict | None:
    """Re-read the path from DB after a tool call mutated it."""
    from backend.db.crud.growth import get_roadmap_analysis_by_id
    from backend.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        analysis = await get_roadmap_analysis_by_id(session, analysis_id)
    if not analysis:
        return None
    column_name = f"path_{path_key}"
    return getattr(analysis, column_name, None)


def _build_growth_error_response(error: str) -> dict[str, Any]:
    """Return a graceful error response matching CareerAgentResponse shape."""
    logger.debug("Building growth error response: %s", error)
    return {
        "summary": "I'm having trouble right now. Please try again.",
        "job_opportunities": [],
        "skill_gaps": [],
        "upskill_resources": [],
        "next_role_target": "",
        "chips": ["Try again", "Review my plan", "What should I focus on?"],
    }
