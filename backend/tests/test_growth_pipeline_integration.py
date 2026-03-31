"""Tests for LearningBlock integration into growth pipeline."""

from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from backend.agents.growth.schemas import LearningBlock, Phase, PhaseTask
from backend.core.growth_learning_helpers import (
    attach_learning_blocks_to_analysis,
    extract_intake_preferences,
)


def _make_analysis_data() -> dict:
    return {
        "stage": "preliminary",
        "confidence_scores": {"fill_gap": 85, "multidisciplinary": 70, "pivot": 60},
        "gap_questions": [],
        "path_fill_gap": {
            "title": "Backend Mastery",
            "rationale": "Strong Python base",
            "timeline_estimate": "4-6 months",
            "target_role": "Senior Backend Engineer",
            "unfair_advantage": "Deep FastAPI experience",
            "skill_steps": [
                {"skill": "Docker", "why": "Deployment", "resource": "Docker docs", "resource_type": "documentation"},
                {"skill": "Testing", "why": "Quality", "resource": "pytest book", "resource_type": "book"},
            ],
        },
        "path_multidisciplinary": {
            "title": "Full Stack",
            "rationale": "Market demand",
            "timeline_estimate": "6 months",
            "target_role": "Full Stack Developer",
            "unfair_advantage": "API design skills",
            "skill_steps": [
                {"skill": "React", "why": "Frontend", "resource": "React docs", "resource_type": "documentation"},
            ],
        },
        "path_pivot": {
            "title": "DevOps",
            "rationale": "Automation focus",
            "timeline_estimate": "8 months",
            "target_role": "DevOps Engineer",
            "unfair_advantage": "Scripting skills",
            "skill_steps": [
                {"skill": "Terraform", "why": "IaC", "resource": "HashiCorp learn", "resource_type": "course"},
            ],
        },
        "diff_summary": "",
    }


def _make_block(name: str) -> LearningBlock:
    return LearningBlock(
        skill_name=name,
        why_this_matters=f"Important for {name}",
        total_time="~5 hours",
        not_yet=[],
        phases=[Phase(name="Understand", time_estimate="Day 1", tasks=[PhaseTask(action="Read", instruction=f"Read {name}")], stop_signal="Done", anti_patterns=[])],
        prerequisites=[],
    )


@pytest.mark.asyncio
@patch("backend.core.growth_learning_helpers.generate_learning_blocks")
async def test_attach_learning_blocks_adds_blocks_to_all_paths(mock_gen):
    mock_gen.return_value = [_make_block("Docker"), _make_block("Testing")]

    analysis_data = _make_analysis_data()
    cv_data = {"skills": ["Python"], "roles": ["Developer"]}
    intake_prefs = {"career_goal": "Senior Engineer", "learning_style": "hands-on", "target_timeline": "6 months"}

    result = await attach_learning_blocks_to_analysis(analysis_data, cv_data, intake_prefs)

    assert "learning_blocks" in result["path_fill_gap"]
    assert len(result["path_fill_gap"]["learning_blocks"]) == 2
    assert result["path_fill_gap"]["learning_blocks"][0]["skill_name"] == "Docker"
    # All 3 paths should have blocks
    assert "learning_blocks" in result["path_multidisciplinary"]
    assert "learning_blocks" in result["path_pivot"]
    # generate_learning_blocks called 3 times (once per path)
    assert mock_gen.call_count == 3


def test_extract_intake_preferences():
    intake_form = {
        "career_goal": "Senior Engineer",
        "target_timeline": "6 months",
        "learning_style": "hands-on",
        "current_frustrations": "Don't know where to start",
        "external_links": ["https://github.com/user"],
    }
    prefs = extract_intake_preferences(intake_form)
    assert prefs["career_goal"] == "Senior Engineer"
    assert prefs["learning_style"] == "hands-on"
    assert prefs["target_timeline"] == "6 months"
    assert "external_links" not in prefs
