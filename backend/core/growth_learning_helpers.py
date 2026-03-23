"""Helpers for attaching LearningBlocks to growth analysis paths."""

import logging
from typing import Any

from backend.agents.growth.skill_orchestrator import generate_learning_blocks
from backend.core.growth_service_helpers import extract_cv_summary

logger = logging.getLogger(__name__)


def extract_intake_preferences(intake_form: dict[str, Any]) -> dict[str, str]:
    """Extract learning preferences from intake form for skill agents."""
    return {
        "career_goal": intake_form.get("career_goal", ""),
        "learning_style": intake_form.get("learning_style", ""),
        "target_timeline": intake_form.get("target_timeline", ""),
    }


async def attach_learning_blocks_to_analysis(
    analysis_data: dict[str, Any],
    cv_data: dict[str, Any],
    intake_prefs: dict[str, str],
) -> dict[str, Any]:
    """Generate LearningBlocks for each path and attach them to analysis_data."""
    cv_slice = extract_cv_summary(cv_data)
    path_keys = ["path_fill_gap", "path_multidisciplinary", "path_pivot"]

    for path_key in path_keys:
        path_data = analysis_data.get(path_key, {})
        skill_steps = path_data.get("skill_steps", [])

        blocks = await generate_learning_blocks(
            skill_steps=skill_steps,
            user_cv_slice=cv_slice,
            career_goal=intake_prefs.get("career_goal", ""),
            learning_style=intake_prefs.get("learning_style", ""),
            timeline=intake_prefs.get("target_timeline", ""),
            max_detailed=3,
        )

        path_data["learning_blocks"] = [b.model_dump() for b in blocks]

    return analysis_data
