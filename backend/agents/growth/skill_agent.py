"""Per-skill LearningBlock agent — one isolated call per skill step."""

import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from backend.agents.common.llm import build_llm
from backend.agents.growth.schemas import LearningBlock
from backend.agents.growth.skill_agent_prompt import (
    SKILL_AGENT_SYSTEM_PROMPT,
    build_skill_agent_input,
)

logger = logging.getLogger(__name__)


def build_skill_chain() -> Runnable:
    """Build a structured-output chain for the skill agent."""
    llm = build_llm(
        model="gemini-3.1-flash-lite-preview",
        temperature=0.4,
        max_tokens=4096,
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", SKILL_AGENT_SYSTEM_PROMPT),
        ("human", "{input}"),
    ])
    return prompt | llm.with_structured_output(LearningBlock)


async def run_skill_agent(
    skill_name: str,
    skill_why: str,
    user_cv_slice: dict[str, Any],
    career_goal: str,
    learning_style: str,
    timeline: str,
    previous_learnings: str | None = None,
) -> LearningBlock:
    """Run a single skill agent and return a LearningBlock.

    Falls back to an empty block on error so parallel calls
    don't fail the entire batch.
    """
    chain = build_skill_chain()
    prompt_input = build_skill_agent_input(
        skill_name=skill_name,
        skill_why=skill_why,
        user_cv_slice=user_cv_slice,
        career_goal=career_goal,
        learning_style=learning_style,
        timeline=timeline,
        previous_learnings=previous_learnings,
    )

    try:
        result: LearningBlock = await chain.ainvoke({"input": prompt_input})
        logger.info("Skill agent completed", extra={"skill": skill_name})
        return result
    except (ValueError, RuntimeError) as exc:
        logger.error(
            "Skill agent failed for %s: %s", skill_name, exc,
            extra={"skill": skill_name},
        )
        return _build_fallback_block(skill_name)


def _build_fallback_block(skill_name: str) -> LearningBlock:
    """Return an empty LearningBlock when the agent fails."""
    return LearningBlock(
        skill_name=skill_name,
        why_this_matters="Learning block generation unavailable — try again later",
        total_time="Unknown",
        not_yet=[],
        phases=[],
        prerequisites=[],
    )
