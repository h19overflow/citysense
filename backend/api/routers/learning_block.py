"""On-demand LearningBlock expansion endpoint."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.growth.skill_orchestrator import generate_single_learning_block

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
    return getattr(analysis, full_key, None)


@router.post("/learning-block/expand")
async def expand_learning_block(request: ExpandLearningBlockRequest) -> dict:
    """Generate a full LearningBlock for a specific skill step on demand."""
    path_data = await _load_analysis_path(
        request.analysis_id, request.path_key, request.citizen_id,
    )
    if not path_data:
        raise HTTPException(status_code=404, detail="Analysis or path not found")

    skill_steps = path_data.get("skill_steps", [])
    if request.skill_index >= len(skill_steps) or request.skill_index < 0:
        raise HTTPException(status_code=400, detail="Invalid skill_index")

    step = skill_steps[request.skill_index]

    block = await generate_single_learning_block(
        skill_name=step["skill"],
        skill_why=step["why"],
        user_cv_slice={},
        career_goal="",
        learning_style="",
        timeline="",
        previous_learnings=request.previous_learnings,
    )

    return block.model_dump()
