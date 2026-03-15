"""Closure-bound tool for editing the active roadmap path."""

import json
import logging
from typing import Any

from langchain_core.tools import tool

from backend.api.routers.roadmap_cache import invalidate_cache
from backend.db.crud.growth_path import update_roadmap_path_fields
from backend.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

EDITABLE_FIELDS = {
    "title",
    "target_role",
    "timeline_estimate",
    "unfair_advantage",
    "rationale",
}


def build_patch_roadmap_tool(
    analysis_id: str,
    path_key: str,
    citizen_id: str,
):
    """Return a @tool function with analysis_id/path_key/citizen_id captured in closure."""

    @tool
    async def patch_roadmap_path(field: str, value: str) -> str:
        """Edit a field on the user's active growth path.

        Args:
            field: One of: title, target_role, timeline_estimate, unfair_advantage,
                   rationale, skill_steps[N].skill, skill_steps[N].why,
                   skill_steps[N].resource, skill_steps[N].resource_type,
                   add_step, remove_step
            value: The new value. For add_step, a JSON object with skill/why/resource/resource_type.
                   For remove_step, the step index (0-based).
        """
        updates = _parse_field_update(field, value)

        async with AsyncSessionLocal() as session:
            await update_roadmap_path_fields(
                session, analysis_id, path_key, citizen_id, updates,
            )
            await session.commit()

        invalidate_cache(analysis_id)
        return f"Updated '{field}' on the {path_key} path."

    return patch_roadmap_path


def _parse_field_update(field: str, value: str) -> dict[str, Any]:
    """Convert a field + value into a dict suitable for JSONB merge."""
    if field in EDITABLE_FIELDS:
        return {field: value}

    if field.startswith("skill_steps[") and "]." in field:
        idx_str, sub_field = field.split("].", 1)
        idx = int(idx_str.replace("skill_steps[", ""))
        return {"_step_update": {"index": idx, "field": sub_field, "value": value}}

    if field == "add_step":
        step_data = json.loads(value) if isinstance(value, str) else value
        return {"_add_step": step_data}

    if field == "remove_step":
        return {"_remove_step": int(value)}

    raise ValueError(f"Unknown editable field: {field}")
