"""Tests for growth_handler — context prefix builder and tool-call detection."""

from types import SimpleNamespace

from backend.agents.career.growth_handler import (
    _build_growth_context_prefix,
    _was_tool_called,
)


def test_growth_prefix_empty_path() -> None:
    result = _build_growth_context_prefix({}, "fill_gap", None)
    assert "No active growth path found" in result


def test_growth_prefix_with_path() -> None:
    path_data = {
        "title": "Cloud Engineer Track",
        "target_role": "Cloud Engineer",
        "timeline_estimate": "6 months",
        "unfair_advantage": "Strong Linux background",
        "skill_steps": [
            {
                "skill": "AWS",
                "why": "Industry standard",
                "resource": "AWS Certified Cloud Practitioner",
                "resource_type": "course",
            },
            {
                "skill": "Terraform",
                "why": "Infrastructure as code",
                "resource": "HashiCorp Learn",
                "resource_type": "tutorial",
            },
        ],
    }
    result = _build_growth_context_prefix(path_data, "fill_gap", None)

    assert "Cloud Engineer Track" in result
    assert "Cloud Engineer" in result
    assert "6 months" in result
    assert "Strong Linux background" in result
    assert "AWS" in result
    assert "Terraform" in result
    assert "USER WANTS TO DISCUSS" not in result


def test_growth_prefix_with_discuss_context() -> None:
    path_data = {
        "title": "Data Analyst",
        "target_role": "Data Analyst",
        "timeline_estimate": "3 months",
        "unfair_advantage": "Math degree",
        "skill_steps": [],
    }
    result = _build_growth_context_prefix(
        path_data,
        "pivot",
        "Should I learn Python or R first?",
    )

    assert "USER WANTS TO DISCUSS" in result
    assert "Should I learn Python or R first?" in result
    assert "Address this directly" in result


def test_was_tool_called_true() -> None:
    msg_with_tools = SimpleNamespace(tool_calls=[{"name": "patch_roadmap_path"}])
    msg_without = SimpleNamespace()
    result = {"messages": [msg_without, msg_with_tools]}

    assert _was_tool_called(result) is True


def test_was_tool_called_false() -> None:
    msg_no_tools = SimpleNamespace()
    result_empty = {"messages": [msg_no_tools]}
    assert _was_tool_called(result_empty) is False

    result_no_messages = {}
    assert _was_tool_called(result_no_messages) is False
