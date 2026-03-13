"""Growth plan orchestration service — wires intake, crawl, and analysis agents."""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.growth.analysis_agent import run_final_analysis, run_preliminary_analysis
from backend.core.exceptions import NotFoundError
from backend.core.growth_service_helpers import (
    intake_to_dict,
    persist_analysis,
    run_crawl_pipeline,
    serialize_analysis,
)
from backend.db.crud.growth import (
    create_growth_intake,
    get_growth_intake,
    get_latest_roadmap_analysis,
    get_roadmap_analysis_by_id,
    list_roadmap_analyses_by_citizen,
    update_roadmap_analysis_answers,
)

logger = logging.getLogger(__name__)


async def process_growth_intake(
    session: AsyncSession,
    citizen_id: str,
    intake_form: dict[str, Any],
    cv_data: dict[str, Any],
) -> dict[str, Any]:
    """Run intake pipeline: persist form → crawl → preliminary analysis → persist result."""
    intake = await create_growth_intake(session, citizen_id=citizen_id, **intake_form)
    logger.info("Growth intake created", extra={"citizen_id": citizen_id, "intake_id": intake.id})

    urls: list[str] = intake_form.get("external_links") or []
    crawl_signals = await run_crawl_pipeline(
        session,
        intake.id,
        urls,
        cv_data,
        intake.career_goal,
        intake.target_timeline,
    )

    analysis_data = await run_preliminary_analysis(cv_data, intake_form, crawl_signals)
    analysis = await persist_analysis(session, citizen_id, intake.id, "preliminary", analysis_data)
    return {"intake_id": intake.id, "analysis_id": analysis.id, "analysis": serialize_analysis(analysis)}


async def process_gap_answers(
    session: AsyncSession,
    citizen_id: str,
    preliminary_analysis_id: str,
    gap_answers: dict[str, Any],
    cv_data: dict[str, Any],
) -> dict[str, Any]:
    """Persist gap answers and run final analysis against the preliminary version."""
    previous_record = await update_roadmap_analysis_answers(
        session, preliminary_analysis_id, gap_answers
    )
    if previous_record is None:
        raise NotFoundError(
            "Preliminary analysis not found",
            {"analysis_id": preliminary_analysis_id},
        )

    intake = await get_growth_intake(session, previous_record.intake_id)
    if intake is None:
        raise NotFoundError("Growth intake not found", {"intake_id": previous_record.intake_id})

    crawl_signals: dict[str, Any] = intake.crawl_results or {}
    intake_form = intake_to_dict(intake)
    previous_analysis = serialize_analysis(previous_record)

    analysis_data = await run_final_analysis(
        cv_data, intake_form, crawl_signals, gap_answers, previous_analysis
    )
    analysis = await persist_analysis(session, citizen_id, intake.id, "final", analysis_data)
    return {"analysis_id": analysis.id, "analysis": serialize_analysis(analysis)}


async def get_latest_roadmap(
    session: AsyncSession,
    citizen_id: str,
) -> dict[str, Any] | None:
    """Fetch the latest roadmap analysis for a citizen, or None if none exist."""
    record = await get_latest_roadmap_analysis(session, citizen_id)
    if record is None:
        return None
    return serialize_analysis(record)


async def get_roadmap_history(
    session: AsyncSession,
    citizen_id: str,
) -> list[dict[str, Any]]:
    """Fetch all roadmap analysis versions for a citizen, newest first."""
    records = await list_roadmap_analyses_by_citizen(session, citizen_id)
    return [serialize_analysis(r) for r in records]


async def compute_roadmap_diff(
    session: AsyncSession,
    analysis_id_1: str,
    analysis_id_2: str,
) -> dict[str, Any]:
    """Return diff narrative and side-by-side paths between two analysis versions."""
    record_1 = await get_roadmap_analysis_by_id(session, analysis_id_1)
    record_2 = await get_roadmap_analysis_by_id(session, analysis_id_2)

    if record_1 is None:
        raise NotFoundError("Analysis not found", {"analysis_id": analysis_id_1})
    if record_2 is None:
        raise NotFoundError("Analysis not found", {"analysis_id": analysis_id_2})

    return {
        "version_from": record_1.version_number,
        "version_to": record_2.version_number,
        "diff_summary": record_2.diff_summary or "",
        "paths_from": {
            "fill_gap": record_1.path_fill_gap,
            "multidisciplinary": record_1.path_multidisciplinary,
            "pivot": record_1.path_pivot,
        },
        "paths_to": {
            "fill_gap": record_2.path_fill_gap,
            "multidisciplinary": record_2.path_multidisciplinary,
            "pivot": record_2.path_pivot,
        },
    }
