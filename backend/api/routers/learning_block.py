"""On-demand LearningBlock expansion endpoint."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.growth.skill_orchestrator import generate_single_learning_block
from backend.core.growth_service_helpers import extract_cv_summary
from backend.core.growth_learning_helpers import extract_intake_preferences

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/growth", tags=["growth"])


class ExpandLearningBlockRequest(BaseModel):
    analysis_id: str
    path_key: str
    citizen_id: str
    skill_index: int
    previous_learnings: str | None = None


async def _load_analysis_path(
    analysis_id: str, path_key: str, citizen_id: str,
) -> dict[str, Any] | None:
    """Load a specific path from a roadmap analysis with IDOR check."""
    from backend.db.session import get_session
    from backend.db.crud.growth import get_roadmap_analysis_by_id

    async with get_session() as session:
        analysis = await get_roadmap_analysis_by_id(session, analysis_id)
    if not analysis or analysis.citizen_id != citizen_id:
        return None
    full_key = f"path_{path_key}" if not path_key.startswith("path_") else path_key
    path = getattr(analysis, full_key, None)
    if path is None:
        return None
    return {"path": path, "analysis": analysis}


@router.post("/learning-block/expand")
async def expand_learning_block(request: ExpandLearningBlockRequest) -> dict:
    """Generate a full LearningBlock for a specific skill step on demand."""
    result = await _load_analysis_path(
        request.analysis_id, request.path_key, request.citizen_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Analysis or path not found")

    path_data = result["path"]
    analysis = result["analysis"]
    skill_steps = path_data.get("skill_steps", [])
    if request.skill_index >= len(skill_steps) or request.skill_index < 0:
        raise HTTPException(status_code=400, detail="Invalid skill_index")

    step = skill_steps[request.skill_index]
    intake_prefs = await _load_intake_preferences(analysis.intake_id)

    block = await generate_single_learning_block(
        skill_name=step["skill"],
        skill_why=step["why"],
        user_cv_slice=extract_cv_summary({}),
        career_goal=intake_prefs.get("career_goal", ""),
        learning_style=intake_prefs.get("learning_style", ""),
        timeline=intake_prefs.get("target_timeline", ""),
        previous_learnings=request.previous_learnings,
    )

    return block.model_dump()


async def _load_intake_preferences(intake_id: str) -> dict[str, str]:
    """Load intake preferences from the DB for personalized expansion."""
    from backend.db.session import get_session
    from backend.db.crud.growth import get_growth_intake

    async with get_session() as session:
        intake = await get_growth_intake(session, intake_id)
    if not intake:
        return {}
    return extract_intake_preferences({
        "career_goal": intake.career_goal or "",
        "learning_style": intake.learning_style or "",
        "target_timeline": intake.target_timeline or "",
    })
