"""Career intelligence agent — proactive job matching and upskilling advisor."""

import logging
from typing import Any, cast

from dotenv import load_dotenv

load_dotenv()

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph.state import CompiledStateGraph

from backend.agents.career.prompt import CAREER_AGENT_PROMPT
from backend.agents.career.schemas import CareerAgentResponse
from backend.agents.career.tools.registry import CAREER_TOOLS
from backend.agents.common.llm import build_llm

logger = logging.getLogger(__name__)

_cached_agent: CompiledStateGraph | None = None
MAX_HISTORY_TURNS = 6


def build_career_agent() -> CompiledStateGraph:
    """Return the cached career agent, building once on first call."""
    global _cached_agent
    if _cached_agent is not None:
        return _cached_agent
    llm = build_llm()
    _cached_agent = create_agent(
        model=llm,
        tools=CAREER_TOOLS,
        system_prompt=CAREER_AGENT_PROMPT,
        response_format=CareerAgentResponse,
    )
    return _cached_agent


async def run_career_analysis(
    cv_result: Any,
    citizen_profile: Any,
) -> dict[str, Any]:
    """Run initial career analysis from a parsed CV and citizen profile.

    Summarizes the profile and recommends a next role. Job search tools
    are only called when the citizen explicitly requests them.
    """
    agent = cast(CompiledStateGraph, build_career_agent())
    prompt = _build_analysis_prompt(cv_result, citizen_profile)
    messages = [HumanMessage(content=prompt)]

    try:
        result = await agent.ainvoke({"messages": messages})
        return _extract_response(result)
    except (ValueError, RuntimeError) as e:
        logger.error(
            "Career analysis failed: %s",
            str(e),
            extra={"operation": "run_career_analysis"},
        )
        return _build_error_response(str(e))


async def handle_career_chat(
    message: str,
    context: dict[str, Any],
    history: list[HumanMessage | AIMessage],
) -> dict[str, Any]:
    """Handle a follow-up chat message with pre-computed career context.

    Args:
        message: The citizen's follow-up question.
        context: The previously computed CareerAgentResponse dict.
        history: Conversation history (max MAX_HISTORY_TURNS messages).
    """
    agent = cast(CompiledStateGraph, build_career_agent())
    context_prefix = _build_context_prefix(context)
    messages = [
        HumanMessage(content=context_prefix),
        *history[-MAX_HISTORY_TURNS:],
        HumanMessage(content=message),
    ]

    try:
        result = await agent.ainvoke({"messages": messages})
        return _extract_response(result)
    except (ValueError, RuntimeError) as e:
        logger.error(
            "Career chat failed: %s",
            str(e),
            extra={"operation": "handle_career_chat"},
        )
        return _build_error_response(str(e))


def _build_analysis_prompt(cv_result: Any, citizen_profile: Any) -> str:
    """Build the initial analysis prompt from CV and profile data."""
    skills = ", ".join(getattr(cv_result, "skills", []) or [])
    tools = ", ".join(getattr(cv_result, "tools", []) or [])
    roles = ", ".join(getattr(cv_result, "roles", []) or [])
    current_title = getattr(citizen_profile, "job_title", "Unknown") or "Unknown"
    salary = getattr(citizen_profile, "salary", "Unknown") or "Unknown"

    return (
        f"Here is the citizen's career profile. Summarize their strengths "
        f"and recommend a next role target. Do NOT search for jobs unless asked.\n\n"
        f"Current title: {current_title}\n"
        f"Current salary: {salary}\n"
        f"Skills: {skills or 'Not specified'}\n"
        f"Tools: {tools or 'Not specified'}\n"
        f"Inferred roles: {roles or 'Not specified'}\n"
    )


def _build_context_prefix(context: dict[str, Any]) -> str:
    """Build a full context summary for follow-up chat so no tool calls are needed."""
    if not context:
        return (
            "[No prior career analysis found]\n"
            "You have no CV data for this citizen. "
            "Politely let them know you don't have their profile yet and ask them to upload their CV first."
        )

    summary = context.get("summary", "")
    next_role = context.get("next_role_target", "")

    jobs = context.get("job_opportunities", [])
    jobs_text = "\n".join(
        f"  - {j.get('title', '?')} at {j.get('company', '?')} ({j.get('match_percent', 0)}% match)"
        for j in jobs
    ) or "  None found"

    gaps = context.get("skill_gaps", [])
    gaps_text = "\n".join(
        f"  - {g.get('skill', '?')} [{g.get('importance', '?')}]"
        for g in gaps
    ) or "  None found"

    resources = context.get("upskill_resources", [])
    resources_text = "\n".join(
        f"  - {r.get('skill', '?')}: {r.get('resource_name', '?')} ({r.get('provider', '?')})"
        for r in resources
    ) or "  None found"

    return (
        f"[Career analysis already complete]\n"
        f"Summary: {summary}\n"
        f"Target role: {next_role}\n\n"
        f"Job opportunities:\n{jobs_text}\n\n"
        f"Skill gaps:\n{gaps_text}\n\n"
        f"Upskill resources:\n{resources_text}\n\n"
        f"For SIMPLE or PROFILE_QUESTION turns, answer using ONLY the above context — no tools.\n"
        f"For JOB_SEARCH turns, call search_local_jobs then search_web_jobs to fetch fresh results."
    )


def _extract_response(result: dict[str, Any]) -> dict[str, Any]:
    """Extract CareerAgentResponse from agent result."""
    structured: CareerAgentResponse | None = result.get("structured_response")
    if structured:
        return structured.model_dump()
    return _build_error_response("Agent returned no structured response.")


def _build_error_response(error: str) -> dict[str, Any]:
    """Return a graceful error response matching CareerAgentResponse shape."""
    logger.debug("Building error response: %s", error)
    return {
        "summary": (
            "I'm having trouble analyzing your career profile right now. "
            "Please try again."
        ),
        "job_opportunities": [],
        "skill_gaps": [],
        "upskill_resources": [],
        "next_role_target": "",
        "chips": ["Try again", "What jobs are available?", "What should I learn?"],
    }
