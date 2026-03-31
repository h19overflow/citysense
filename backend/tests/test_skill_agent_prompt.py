"""Tests for skill agent prompt builder."""

from backend.agents.growth.skill_agent_prompt import (
    SKILL_AGENT_SYSTEM_PROMPT,
    build_skill_agent_input,
)


def test_system_prompt_exists():
    assert "Phase 1: Understand" in SKILL_AGENT_SYSTEM_PROMPT
    assert "Phase 2: Build" in SKILL_AGENT_SYSTEM_PROMPT
    assert "Phase 3: Prove" in SKILL_AGENT_SYSTEM_PROMPT
    assert "stop_signal" in SKILL_AGENT_SYSTEM_PROMPT


def test_build_skill_agent_input_basic():
    result = build_skill_agent_input(
        skill_name="Docker",
        skill_why="Needed for deployment",
        user_cv_slice={"skills": ["Python", "FastAPI"], "roles": ["Backend Developer"]},
        career_goal="Senior Backend Engineer",
        learning_style="hands-on",
        timeline="6 months",
    )
    assert "Docker" in result
    assert "Python" in result
    assert "Senior Backend Engineer" in result
    assert "hands-on" in result


def test_build_skill_agent_input_with_previous_learnings():
    result = build_skill_agent_input(
        skill_name="Kubernetes",
        skill_why="Container orchestration",
        user_cv_slice={"skills": ["Python"], "roles": ["Developer"]},
        career_goal="DevOps Engineer",
        learning_style="visual",
        timeline="3 months",
        previous_learnings="User struggled with async concepts in step 1. Preferred video content.",
    )
    assert "struggled with async" in result
    assert "Kubernetes" in result
