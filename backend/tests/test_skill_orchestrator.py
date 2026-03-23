"""Tests for skill orchestrator — parallel fan-out and assembly."""

from unittest.mock import patch

import pytest

from backend.agents.growth.schemas import LearningBlock, Phase, PhaseTask
from backend.agents.growth.skill_orchestrator import (
    generate_learning_blocks,
    generate_single_learning_block,
)


def _make_block(name: str) -> LearningBlock:
    return LearningBlock(
        skill_name=name,
        why_this_matters=f"Important for {name}",
        total_time="~5 hours",
        not_yet=[],
        phases=[
            Phase(
                name="Understand",
                time_estimate="Day 1",
                tasks=[PhaseTask(action="Read", instruction=f"Read about {name}")],
                stop_signal=f"Can explain {name}",
                anti_patterns=[],
            ),
        ],
        prerequisites=[],
    )


@pytest.mark.asyncio
@patch("backend.agents.growth.skill_orchestrator.run_skill_agent")
async def test_generate_learning_blocks_parallel(mock_agent):
    mock_agent.side_effect = lambda skill_name, **kw: _make_block(skill_name)

    skill_steps = [
        {"skill": "Docker", "why": "Deployment"},
        {"skill": "FastAPI Testing", "why": "Quality"},
        {"skill": "System Design", "why": "Architecture"},
    ]

    blocks = await generate_learning_blocks(
        skill_steps=skill_steps,
        user_cv_slice={"skills": ["Python"]},
        career_goal="Senior Engineer",
        learning_style="hands-on",
        timeline="6 months",
        max_detailed=2,
    )

    # First 2 should be full blocks, 3rd should be empty (not detailed)
    assert len(blocks) == 3
    assert blocks[0].skill_name == "Docker"
    assert len(blocks[0].phases) == 1
    assert blocks[1].skill_name == "FastAPI Testing"
    assert len(blocks[1].phases) == 1
    # Third is stub (beyond max_detailed)
    assert blocks[2].skill_name == "System Design"
    assert blocks[2].phases == []


@pytest.mark.asyncio
@patch("backend.agents.growth.skill_orchestrator.run_skill_agent")
async def test_generate_single_learning_block(mock_agent):
    mock_agent.return_value = _make_block("Kubernetes")

    block = await generate_single_learning_block(
        skill_name="Kubernetes",
        skill_why="Container orchestration",
        user_cv_slice={"skills": ["Docker"]},
        career_goal="DevOps Engineer",
        learning_style="visual",
        timeline="3 months",
        previous_learnings="User already knows Docker basics",
    )

    assert block.skill_name == "Kubernetes"
    mock_agent.assert_called_once()
    call_kwargs = mock_agent.call_args[1]
    assert call_kwargs["previous_learnings"] == "User already knows Docker basics"
