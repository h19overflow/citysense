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
    skills_seen: set[str] = set()
    soft_skills_seen: set[str] = set()
    tools_seen: set[str] = set()
    roles_seen: set[str] = set()

    for page in page_results:
        all_experience.extend(page.experience)
        skills_seen.update(_normalize_items(page.skills))
        soft_skills_seen.update(_normalize_items(page.soft_skills))
        tools_seen.update(_normalize_items(page.tools))
        roles_seen.update(_normalize_items(page.roles))

    return CVAnalysisResult(
        experience=all_experience,
        skills=sorted(skills_seen),
        soft_skills=sorted(soft_skills_seen),
        tools=sorted(tools_seen),
        roles=sorted(roles_seen),
        page_count=len(page_results),
    )


def _normalize_items(items: list[str]) -> list[str]:
    """Lowercase-strip for dedup, return originals."""
    seen: dict[str, str] = {}
    for item in items:
        key = item.strip().lower()
        if key and key not in seen:
            seen[key] = item.strip()
    return list(seen.values())
