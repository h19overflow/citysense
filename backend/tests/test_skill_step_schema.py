"""Tests for the enriched SkillStep schema and related components."""

import pytest
from pydantic import ValidationError

from backend.agents.growth.schemas import RoadmapPath, SkillStep
from backend.agents.career.tools.roadmap_tools import _parse_field_update


class TestSkillStepMinimal:
    """SkillStep with only required fields."""

    def test_skill_step_minimal(self) -> None:
        step = SkillStep(
            skill="Python",
            why="Foundation for backend dev",
            resource="Real Python",
            resource_type="course",
        )
        assert step.skill == "Python"
        assert step.why == "Foundation for backend dev"
        assert step.resource == "Real Python"
        assert step.resource_type == "course"
        assert step.resource_url is None
        assert step.importance is None
        assert step.mindset is None


class TestSkillStepFull:
    """SkillStep with all fields populated."""

    def test_skill_step_full(self) -> None:
        step = SkillStep(
            skill="Kubernetes",
            why="Container orchestration for production",
            resource="Kubernetes Up & Running",
            resource_url="https://kubernetes.io/docs/",
            resource_type="book",
            importance="Essential for scaling microservices",
            mindset="Think in declarative infrastructure",
        )
        assert step.skill == "Kubernetes"
        assert step.resource_url == "https://kubernetes.io/docs/"
        assert step.resource_type == "book"
        assert step.importance == "Essential for scaling microservices"
        assert step.mindset == "Think in declarative infrastructure"


class TestSkillStepResourceType:
    """Resource type literal validation."""

    def test_skill_step_documentation_type(self) -> None:
        step = SkillStep(
            skill="FastAPI",
            why="Modern async web framework",
            resource="FastAPI docs",
            resource_type="documentation",
        )
        assert step.resource_type == "documentation"

    def test_skill_step_invalid_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SkillStep(
                skill="FastAPI",
                why="Modern async web framework",
                resource="FastAPI docs",
                resource_type="podcast",
            )


class TestSkillStepSerialization:
    """Serialization behavior for optional fields."""

    def test_skill_step_serialization_excludes_none(self) -> None:
        step = SkillStep(
            skill="SQL",
            why="Data querying",
            resource="SQLBolt",
            resource_type="course",
        )
        dumped = step.model_dump(exclude_none=True)
        assert "resource_url" not in dumped
        assert "importance" not in dumped
        assert "mindset" not in dumped
        assert dumped["skill"] == "SQL"
        assert dumped["resource_type"] == "course"


class TestRoadmapPathWithEnrichedSteps:
    """RoadmapPath containing enriched SkillSteps."""

    def test_roadmap_path_with_enriched_steps(self) -> None:
        path = RoadmapPath(
            title="Backend Engineer Path",
            rationale="Strong Python foundation from CV",
            timeline_estimate="4-6 months",
            target_role="Senior Backend Engineer",
            unfair_advantage="3 years Django experience",
            skill_steps=[
                SkillStep(
                    skill="FastAPI",
                    why="Modern async framework",
                    resource="FastAPI docs",
                    resource_url="https://fastapi.tiangolo.com",
                    resource_type="documentation",
                    importance="Core framework for target role",
                    mindset="Embrace async patterns",
                ),
                SkillStep(
                    skill="Docker",
                    why="Containerization standard",
                    resource="Docker Hub",
                    resource_url="https://hub.docker.com",
                    resource_type="community",
                    importance="Required by 90% of job postings",
                    mindset="Think in containers",
                ),
            ],
        )
        dumped = path.model_dump()
        assert len(dumped["skill_steps"]) == 2
        assert dumped["skill_steps"][0]["resource_url"] == "https://fastapi.tiangolo.com"
        assert dumped["skill_steps"][0]["importance"] == "Core framework for target role"
        assert dumped["skill_steps"][1]["mindset"] == "Think in containers"


class TestParseFieldUpdateEnrichedStep:
    """_parse_field_update with enriched SkillStep JSON."""

    def test_parse_field_update_with_enriched_step(self) -> None:
        step_json = (
            '{"skill":"React","why":"Frontend framework",'
            '"resource":"React docs",'
            '"resource_url":"https://react.dev",'
            '"resource_type":"documentation",'
            '"importance":"Most popular frontend framework",'
            '"mindset":"Think in components"}'
        )
        result = _parse_field_update("add_step", step_json)
        assert result == {
            "_add_step": {
                "skill": "React",
                "why": "Frontend framework",
                "resource": "React docs",
                "resource_url": "https://react.dev",
                "resource_type": "documentation",
                "importance": "Most popular frontend framework",
                "mindset": "Think in components",
            }
        }
