"""Aggregate per-page analysis results into a single CV profile."""

from __future__ import annotations

import asyncio

from backend.core.cv_pipeline.schemas import CVAnalysisResult, PageAnalysis


async def aggregate_page_results(
    page_results: list[PageAnalysis],
) -> CVAnalysisResult:
    """Merge per-page extractions into a unified CV analysis.

    Deduplicates skills, soft_skills, tools, and roles across pages.
    Preserves all experience entries in order.

    Args:
        page_results: Analysis output from each page.

    Returns:
        Single aggregated CVAnalysisResult.
    """
    return await asyncio.to_thread(_aggregate_sync, page_results)


def _aggregate_sync(page_results: list[PageAnalysis]) -> CVAnalysisResult:
    """Synchronous aggregation logic."""
    all_experience = []
    skills_map: dict[str, str] = {}
    soft_skills_map: dict[str, str] = {}
    tools_map: dict[str, str] = {}
    roles_map: dict[str, str] = {}

    for page in page_results:
        all_experience.extend(page.experience)
        _merge_items(skills_map, page.skills)
        _merge_items(soft_skills_map, page.soft_skills)
        _merge_items(tools_map, page.tools)
        _merge_items(roles_map, page.roles)

    return CVAnalysisResult(
        experience=all_experience,
        skills=sorted(skills_map.values()),
        soft_skills=sorted(soft_skills_map.values()),
        tools=sorted(tools_map.values()),
        roles=sorted(roles_map.values()),
        page_count=len(page_results),
    )


def _merge_items(target: dict[str, str], items: list[str]) -> None:
    """Merge items into target dict using lowercase keys for dedup.

    Preserves the first-seen casing of each item.
    """
    for item in items:
        key = item.strip().lower()
        if key and key not in target:
            target[key] = item.strip()
