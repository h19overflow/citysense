"""Private helpers for the growth plan orchestration service."""

import logging
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.growth.crawl_agent import run_all_crawl_agents
from backend.agents.growth.crawl_aggregator import aggregate_crawl_results
from backend.agents.growth.strategist_agent import run_strategist_agent
from backend.core.growth_progress import emit_progress
from backend.db.crud.growth import (
    create_roadmap_analysis,
    get_next_analysis_version_number,
    update_growth_intake_crawl_data,
)
from backend.db.models.growth_plan import GrowthIntake, RoadmapAnalysis

_ANALYSIS_DATA_KEYS = frozenset({
    "confidence_scores", "gap_questions", "gap_answers",
    "path_fill_gap", "path_multidisciplinary", "path_pivot", "diff_summary",
})

logger = logging.getLogger(__name__)


async def run_crawl_pipeline(
    session: AsyncSession,
    intake_id: str,
    urls: list[str],
    cv_data: dict[str, Any],
    career_goal: str,
    target_timeline: str,
) -> dict[str, Any]:
    """Run strategist → parallel crawl → aggregator. Persist results. Return aggregated signals."""
    if not urls:
        await emit_progress(intake_id, "analyzing", "No links provided — running direct analysis…", 40)
        return {}

    cv_summary = extract_cv_summary(cv_data)
    await emit_progress(intake_id, "strategizing", "Planning how to read your links…", 10)
    strategies = await run_strategist_agent(urls, cv_summary, career_goal, target_timeline)
    await emit_progress(intake_id, "crawling", f"Reading {len(strategies)} link(s)…", 30)
    crawl_results = await run_all_crawl_agents(strategies)
    aggregated = aggregate_crawl_results(crawl_results)
    await emit_progress(intake_id, "aggregating", "Combining signals…", 60)

    await update_growth_intake_crawl_data(
        session,
        intake_id,
        [s.model_dump() for s in strategies],
        aggregated,
    )

    logger.info(
        "Crawl pipeline complete",
        extra={"intake_id": intake_id, "source_count": aggregated.get("source_count", 0)},
    )
    return aggregated


def extract_cv_summary(cv_data: dict[str, Any]) -> dict[str, Any]:
    """Extract the fields the strategist agent expects from raw cv_data."""
    return {
        "skills": cv_data.get("skills", []),
        "tools": cv_data.get("tools", []),
        "roles": cv_data.get("roles", []),
        "experience_summary": cv_data.get("summary", cv_data.get("experience_summary", "")),
    }


async def persist_analysis(
    session: AsyncSession,
    citizen_id: str,
    intake_id: str,
    stage: Literal["preliminary", "final"],
    analysis_data: dict[str, Any],
) -> RoadmapAnalysis:
    """Version and persist a RoadmapAnalysis row, returning the saved record."""
    safe_data = {k: v for k, v in analysis_data.items() if k in _ANALYSIS_DATA_KEYS}
    version = await get_next_analysis_version_number(session, citizen_id)
    analysis = await create_roadmap_analysis(
        session,
        citizen_id=citizen_id,
        intake_id=intake_id,
        version_number=version,
        stage=stage,
        **safe_data,
    )
    logger.info(
        "Analysis persisted",
        extra={"citizen_id": citizen_id, "analysis_id": analysis.id, "stage": stage, "version": version},
    )
    return analysis


def intake_to_dict(intake: GrowthIntake) -> dict[str, Any]:
    """Convert a GrowthIntake ORM object to a plain dict for agent consumption."""
    return {
        "career_goal": intake.career_goal,
        "target_timeline": intake.target_timeline,
        "learning_style": intake.learning_style,
        "current_frustrations": intake.current_frustrations,
        "external_links": intake.external_links or [],
    }


def serialize_analysis(analysis: RoadmapAnalysis) -> dict[str, Any]:
    """Serialize a RoadmapAnalysis ORM object to a plain dict."""
    return {
        "id": analysis.id,
        "version_number": analysis.version_number,
        "stage": analysis.stage,
        "confidence_scores": analysis.confidence_scores,
        "gap_questions": analysis.gap_questions,
        "gap_answers": analysis.gap_answers,
        "path_fill_gap": analysis.path_fill_gap,
        "path_multidisciplinary": analysis.path_multidisciplinary,
        "path_pivot": analysis.path_pivot,
        "diff_summary": analysis.diff_summary,
        "created_at": analysis.created_at.isoformat(),
    }
