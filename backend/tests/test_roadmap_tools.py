"""Tests for Growth Guide roadmap tools and field parsing."""

import pytest

from backend.agents.career.tools.roadmap_tools import (
    _parse_field_update,
    build_patch_roadmap_tool,
)
from backend.agents.career.tools.registry import build_growth_tools


class TestParseFieldUpdate:
    """Tests for _parse_field_update helper."""

    def test_parse_simple_field(self) -> None:
        result = _parse_field_update("title", "New Title")
        assert result == {"title": "New Title"}

    def test_parse_simple_field_target_role(self) -> None:
        result = _parse_field_update("target_role", "Senior Developer")
        assert result == {"target_role": "Senior Developer"}

    def test_parse_step_update(self) -> None:
        result = _parse_field_update("skill_steps[1].resource", "Udemy Course X")
        assert result == {
            "_step_update": {
                "index": 1,
                "field": "resource",
                "value": "Udemy Course X",
            }
        }

    def test_parse_step_update_index_zero(self) -> None:
        result = _parse_field_update("skill_steps[0].skill", "Python")
        assert result == {
            "_step_update": {"index": 0, "field": "skill", "value": "Python"}
        }

    def test_parse_add_step(self) -> None:
        step_json = '{"skill": "Docker", "why": "Needed for deployment", "resource": "docs.docker.com", "resource_type": "docs"}'
        result = _parse_field_update("add_step", step_json)
        assert result == {
            "_add_step": {
                "skill": "Docker",
                "why": "Needed for deployment",
                "resource": "docs.docker.com",
                "resource_type": "docs",
            }
        }

    def test_parse_remove_step(self) -> None:
        result = _parse_field_update("remove_step", "2")
        assert result == {"_remove_step": 2}

    def test_parse_invalid_field(self) -> None:
        with pytest.raises(ValueError, match="Unknown editable field"):
            _parse_field_update("nonexistent_field", "value")


class TestBuildGrowthTools:
    """Tests for build_growth_tools registry function."""

    def test_returns_list_with_one_tool(self) -> None:
        tools = build_growth_tools("analysis-1", "fill_gap", "citizen-1")
        assert isinstance(tools, list)
        assert len(tools) == 1

    def test_tool_has_correct_name(self) -> None:
        tools = build_growth_tools("analysis-1", "fill_gap", "citizen-1")
        assert tools[0].name == "patch_roadmap_path"


class TestParseAddStepEnriched:
    """Verify add_step parsing with all enriched SkillStep fields."""

    def test_parse_add_step_with_enriched_fields(self) -> None:
        step_json = (
            '{"skill":"Docker","why":"Deploy",'
            '"resource":"Docker Hub",'
            '"resource_url":"https://hub.docker.com",'
            '"resource_type":"documentation",'
            '"importance":"Critical for CI/CD",'
            '"mindset":"Think in containers"}'
        )
        result = _parse_field_update("add_step", step_json)
        assert result == {
            "_add_step": {
                "skill": "Docker",
                "why": "Deploy",
                "resource": "Docker Hub",
                "resource_url": "https://hub.docker.com",
                "resource_type": "documentation",
                "importance": "Critical for CI/CD",
                "mindset": "Think in containers",
            }
        }
