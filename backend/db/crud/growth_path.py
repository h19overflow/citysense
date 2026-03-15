"""CRUD operations for roadmap path JSONB field mutations."""

import copy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.exceptions import NotFoundError
from backend.db.models.growth_plan import RoadmapAnalysis

PATH_COLUMN_MAP = {
    "fill_gap": "path_fill_gap",
    "multidisciplinary": "path_multidisciplinary",
    "pivot": "path_pivot",
}


def _apply_skill_step_mutations(
    path: dict[str, Any], updates: dict[str, Any],
) -> dict[str, Any]:
    """Apply _step_update, _add_step, _remove_step to path's skill_steps."""
    steps = list(path.get("skill_steps", []))

    if "_step_update" in updates:
        mutation = updates.pop("_step_update")
        steps[mutation["index"]][mutation["field"]] = mutation["value"]

    if "_add_step" in updates:
        steps.append(updates.pop("_add_step"))

    if "_remove_step" in updates:
        steps.pop(updates.pop("_remove_step"))

    path["skill_steps"] = steps
    return path


async def update_roadmap_path_fields(
    session: AsyncSession,
    analysis_id: str,
    path_key: str,
    citizen_id: str,
    updates: dict[str, Any],
) -> dict[str, Any]:
    """Merge updates into a specific path's JSONB column.

    Raises ValueError if path_key is invalid.
    Raises NotFoundError if analysis not found or citizen_id mismatches.
    Returns the full updated path dict.
    """
    column_name = PATH_COLUMN_MAP.get(path_key)
    if not column_name:
        raise ValueError(f"Invalid path_key: {path_key}")

    stmt = (
        select(RoadmapAnalysis)
        .where(RoadmapAnalysis.id == analysis_id)
        .limit(1)
        .with_for_update()
    )
    result = await session.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis or analysis.citizen_id != citizen_id:
        raise NotFoundError("Roadmap analysis not found")

    current_path = copy.deepcopy(getattr(analysis, column_name) or {})
    updates = dict(updates)  # avoid mutating caller's dict

    current_path = _apply_skill_step_mutations(current_path, updates)
    merged = {**current_path, **updates}

    setattr(analysis, column_name, merged)
    await session.flush()
    await session.refresh(analysis)
    session.expunge(analysis)

    return getattr(analysis, column_name)
