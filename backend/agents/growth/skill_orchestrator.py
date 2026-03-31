"""Orchestrator for parallel LearningBlock generation."""

import asyncio
import logging
from typing import Any

from backend.agents.growth.schemas import LearningBlock
from backend.agents.growth.skill_agent import run_skill_agent

logger = logging.getLogger(__name__)


async def generate_learning_blocks(
    skill_steps: list[dict[str, Any]],
    user_cv_slice: dict[str, Any],
    career_goal: str,
    learning_style: str,
    timeline: str,
    max_detailed: int = 3,
) -> list[LearningBlock]:
    """Fan out parallel skill agents for the first N steps, stubs for the rest."""
    detailed_steps = skill_steps[:max_detailed]
    stub_steps = skill_steps[max_detailed:]

    tasks = [
        run_skill_agent(
            skill_name=step["skill"],
            skill_why=step["why"],
            user_cv_slice=user_cv_slice,
            career_goal=career_goal,
            learning_style=learning_style,
            timeline=timeline,
        )
        for step in detailed_steps
    ]

    detailed_blocks = await asyncio.gather(*tasks)

    stub_blocks = [
        LearningBlock(
            skill_name=step["skill"],
            why_this_matters=step["why"],
            total_time="To be determined",
            not_yet=[],
            phases=[],
            prerequisites=[],
        )
        for step in stub_steps
    ]

    all_blocks = list(detailed_blocks) + stub_blocks
    logger.info(
        "Skill orchestrator complete: %d detailed, %d stubs",
        len(detailed_blocks),
        len(stub_blocks),
    )
    return all_blocks


async def generate_single_learning_block(
    skill_name: str,
    skill_why: str,
    user_cv_slice: dict[str, Any],
    career_goal: str,
    learning_style: str,
    timeline: str,
    previous_learnings: str | None = None,
) -> LearningBlock:
    """Generate a single LearningBlock on demand (for later steps)."""
    return await run_skill_agent(
        skill_name=skill_name,
        skill_why=skill_why,
        user_cv_slice=user_cv_slice,
        career_goal=career_goal,
        learning_style=learning_style,
        timeline=timeline,
        previous_learnings=previous_learnings,
    )
