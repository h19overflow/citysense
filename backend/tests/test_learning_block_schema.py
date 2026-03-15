"""Tests for LearningBlock Pydantic schema validation."""

from backend.agents.growth.schemas import LearningBlock, Phase, PhaseTask


def test_learning_block_round_trip():
    block = LearningBlock(
        skill_name="Docker Containerization",
        why_this_matters="You need Docker for your FastAPI deployment goal",
        total_time="~10 hours over 2 weeks",
        not_yet=["Kubernetes", "Docker Swarm"],
        phases=[
            Phase(
                name="Understand",
                time_estimate="Days 1-3",
                tasks=[
                    PhaseTask(action="Read", instruction="Docker docs chapters 1-4"),
                    PhaseTask(action="Watch", instruction="Docker crash course (first 45 min only)"),
                ],
                stop_signal="You can explain what a container is and why it's not a VM",
                anti_patterns=["Don't spend 3 days watching tutorials"],
            ),
        ],
        prerequisites=[],
    )
    data = block.model_dump()
    assert data["skill_name"] == "Docker Containerization"
    assert len(data["phases"]) == 1
    assert len(data["phases"][0]["tasks"]) == 2
    assert data["phases"][0]["tasks"][0]["is_completed"] is False


def test_phase_task_defaults():
    task = PhaseTask(action="Build", instruction="Containerize your FastAPI project")
    assert task.is_completed is False
    assert task.user_note is None


def test_learning_block_minimal():
    """A LearningBlock with no phases is valid (for unexpanded steps)."""
    block = LearningBlock(
        skill_name="System Design",
        why_this_matters="Required for senior roles",
        total_time="~15 hours",
        not_yet=[],
        phases=[],
        prerequisites=[],
    )
    assert block.skill_name == "System Design"
    assert block.phases == []


def test_skill_step_still_valid():
    """Ensure existing SkillStep schema is untouched."""
    from backend.agents.growth.schemas import SkillStep
    step = SkillStep(
        skill="Docker",
        why="Needed for deployment",
        resource="Docker docs",
        resource_type="documentation",
    )
    assert step.skill == "Docker"
