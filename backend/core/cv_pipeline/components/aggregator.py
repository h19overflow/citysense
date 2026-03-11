"""Aggregate per-page analysis results into a single CV profile."""

from __future__ import annotations

import asyncio

from backend.core.cv_pipeline.schemas import (
    CVAnalysisResult,
    EducationEntry,
    PageAnalysis,
    ProjectEntry,
)


async def aggregate_page_results(
    page_results: list[PageAnalysis],
) -> CVAnalysisResult:
    """Merge per-page extractions into a unified CV analysis.

    Deduplicates skills, soft_skills, tools, roles, and education across pages.
    Preserves all experience entries in order.
    Picks the longest summary from any page.

    Args:
        page_results: Analysis output from each page.

    Returns:
        Single aggregated CVAnalysisResult.
    """
    return await asyncio.to_thread(_aggregate_sync, page_results)


def _aggregate_sync(page_results: list[PageAnalysis]) -> CVAnalysisResult:
    """Synchronous aggregation logic."""
    all_experience = []
    projects_map: dict[str, ProjectEntry] = {}
    skills_map: dict[str, str] = {}
    soft_skills_map: dict[str, str] = {}
    tools_map: dict[str, str] = {}
    roles_map: dict[str, str] = {}
    education_map: dict[str, EducationEntry] = {}
    best_summary = ""

    for page in page_results:
        all_experience.extend(page.experience)
        _merge_projects(projects_map, page.projects)
        _merge_items(skills_map, page.skills)
        _merge_items(soft_skills_map, page.soft_skills)
        _merge_items(tools_map, page.tools)
        _merge_items(roles_map, page.roles)
        _merge_education(education_map, page.education)
        if len(page.summary) > len(best_summary):
            best_summary = page.summary

    return CVAnalysisResult(
        experience=all_experience,
        projects=list(projects_map.values()),
        skills=sorted(skills_map.values()),
        soft_skills=sorted(soft_skills_map.values()),
        tools=sorted(tools_map.values()),
        roles=sorted(roles_map.values()),
        education=list(education_map.values()),
        summary=best_summary,
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


def _merge_projects(
    target: dict[str, ProjectEntry], entries: list[ProjectEntry]
) -> None:
    """Dedup projects by name (case-insensitive)."""
    for entry in entries:
        key = entry.name.strip().lower()
        if key and key not in target:
            target[key] = entry


def _merge_education(
    target: dict[str, EducationEntry], entries: list[EducationEntry]
) -> None:
    """Dedup education by institution+degree (case-insensitive)."""
    for entry in entries:
        key = f"{entry.institution.strip().lower()}|{entry.degree.strip().lower()}"
        if key not in target:
            target[key] = entry
