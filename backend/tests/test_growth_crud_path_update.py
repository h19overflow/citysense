"""Tests for update_roadmap_path_fields CRUD function."""

import copy

import pytest
from unittest.mock import AsyncMock, MagicMock

from backend.core.exceptions import NotFoundError
from backend.db.crud.growth_path import update_roadmap_path_fields


SAMPLE_PATH = {
    "title": "Fill the Gap",
    "target_role": "Senior Developer",
    "timeline_estimate": "6 months",
    "skill_steps": [
        {"skill": "Python", "why": "Core language", "resource": "Book A", "resource_type": "book"},
        {"skill": "SQL", "why": "Data access", "resource": "Course B", "resource_type": "course"},
        {"skill": "Docker", "why": "Deployment", "resource": "Tutorial C", "resource_type": "tutorial"},
    ],
}


def _make_mock_analysis(
    citizen_id: str = "citizen-1",
    path_fill_gap: dict | None = None,
) -> MagicMock:
    analysis = MagicMock()
    analysis.citizen_id = citizen_id
    analysis.path_fill_gap = copy.deepcopy(path_fill_gap or SAMPLE_PATH)
    analysis.path_multidisciplinary = None
    analysis.path_pivot = None
    return analysis


def _make_mock_session(analysis: MagicMock | None) -> AsyncMock:
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = analysis
    session.execute.return_value = mock_result
    return session


@pytest.mark.asyncio
async def test_update_simple_field() -> None:
    analysis = _make_mock_analysis()
    session = _make_mock_session(analysis)

    result = await update_roadmap_path_fields(
        session, "analysis-1", "fill_gap", "citizen-1", {"title": "New Title"},
    )

    assert result["title"] == "New Title"
    assert result["target_role"] == "Senior Developer"
    assert result["skill_steps"] == SAMPLE_PATH["skill_steps"]
    session.flush.assert_awaited_once()
    session.refresh.assert_awaited_once()
    session.expunge.assert_called_once()


@pytest.mark.asyncio
async def test_update_step_field() -> None:
    analysis = _make_mock_analysis()
    session = _make_mock_session(analysis)

    result = await update_roadmap_path_fields(
        session, "analysis-1", "fill_gap", "citizen-1",
        {"_step_update": {"index": 1, "field": "resource", "value": "New Course"}},
    )

    assert result["skill_steps"][1]["resource"] == "New Course"
    assert result["skill_steps"][1]["skill"] == "SQL"  # unchanged
    assert result["skill_steps"][0]["resource"] == "Book A"  # other steps unchanged


@pytest.mark.asyncio
async def test_add_step() -> None:
    analysis = _make_mock_analysis()
    session = _make_mock_session(analysis)

    new_step = {"skill": "K8s", "why": "Orchestration", "resource": "Doc D", "resource_type": "docs"}
    result = await update_roadmap_path_fields(
        session, "analysis-1", "fill_gap", "citizen-1",
        {"_add_step": new_step},
    )

    assert len(result["skill_steps"]) == 4
    assert result["skill_steps"][3] == new_step


@pytest.mark.asyncio
async def test_remove_step() -> None:
    analysis = _make_mock_analysis()
    session = _make_mock_session(analysis)

    result = await update_roadmap_path_fields(
        session, "analysis-1", "fill_gap", "citizen-1",
        {"_remove_step": 1},
    )

    assert len(result["skill_steps"]) == 2
    assert result["skill_steps"][0]["skill"] == "Python"
    assert result["skill_steps"][1]["skill"] == "Docker"


@pytest.mark.asyncio
async def test_invalid_path_key() -> None:
    session = _make_mock_session(None)

    with pytest.raises(ValueError, match="Invalid path_key"):
        await update_roadmap_path_fields(
            session, "analysis-1", "nonexistent", "citizen-1", {"title": "X"},
        )


@pytest.mark.asyncio
async def test_citizen_id_mismatch() -> None:
    analysis = _make_mock_analysis(citizen_id="citizen-other")
    session = _make_mock_session(analysis)

    with pytest.raises(NotFoundError):
        await update_roadmap_path_fields(
            session, "analysis-1", "fill_gap", "citizen-1", {"title": "X"},
        )


@pytest.mark.asyncio
async def test_analysis_not_found() -> None:
    session = _make_mock_session(None)

    with pytest.raises(NotFoundError):
        await update_roadmap_path_fields(
            session, "nonexistent-id", "fill_gap", "citizen-1", {"title": "X"},
        )
