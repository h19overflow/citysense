"""Tests for agent tool registries and response schemas."""

import pytest

from backend.agents.mayor.tools.registry import TOOLS as MAYOR_TOOLS
from backend.agents.citizen.tools.registry import CITIZEN_TOOLS


class TestMayorToolRegistry:
    def test_tools_list_not_empty(self):
        assert len(MAYOR_TOOLS) > 0

    def test_all_tools_are_callable(self):
        for tool in MAYOR_TOOLS:
            assert hasattr(tool, "invoke")

    def test_all_tools_have_name(self):
        for tool in MAYOR_TOOLS:
            assert hasattr(tool, "name")
            assert isinstance(tool.name, str)
            assert len(tool.name) > 0

    def test_all_tools_have_description(self):
        for tool in MAYOR_TOOLS:
            assert hasattr(tool, "description")
            assert isinstance(tool.description, str)
            assert len(tool.description) > 0

    def test_expected_tools_present(self):
        tool_names = {t.name for t in MAYOR_TOOLS}
        expected = {
            "get_sentiment_summary",
            "get_top_concerns",
            "get_trending_articles",
            "get_predictive_hotspots",
        }
        assert expected.issubset(tool_names)


class TestCitizenToolRegistry:
    def test_tools_list_not_empty(self):
        assert len(CITIZEN_TOOLS) > 0

    def test_all_tools_are_callable(self):
        for tool in CITIZEN_TOOLS:
            assert hasattr(tool, "invoke")

    def test_all_tools_have_name(self):
        for tool in CITIZEN_TOOLS:
            assert hasattr(tool, "name")
            assert isinstance(tool.name, str)
            assert len(tool.name) > 0


class TestAgentResponseSchema:
    def test_citizen_response_schema_importable(self):
        from backend.agents.citizen.schemas import CitizenAgentResponse
        assert CitizenAgentResponse is not None

    def test_citizen_response_has_answer_field(self):
        from backend.agents.citizen.schemas import CitizenAgentResponse
        fields = CitizenAgentResponse.model_fields
        assert "answer" in fields
