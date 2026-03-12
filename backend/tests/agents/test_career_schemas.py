from backend.agents.career.schemas import (
    CareerAgentResponse,
    JobOpportunity,
    SkillGap,
    UpskillResource,
)


def test_job_opportunity_schema():
    job = JobOpportunity(
        title="Software Engineer",
        company="Acme Corp",
        source="local_db",
        url=None,
        match_percent=85,
        matched_skills=["Python", "SQL"],
        missing_skills=["Docker"],
    )
    assert job.match_percent == 85
    assert job.source == "local_db"


def test_skill_gap_schema():
    gap = SkillGap(
        skill="Docker",
        importance="high",
        target_roles=["DevOps Engineer", "Backend Engineer"],
    )
    assert gap.importance == "high"


def test_upskill_resource_schema():
    resource = UpskillResource(
        skill="Docker",
        resource_name="Docker Fundamentals",
        provider="Trenholm State",
        url="https://trenholmstate.edu",
        is_local=True,
    )
    assert resource.is_local is True


def test_career_agent_response_schema():
    response = CareerAgentResponse(
        summary="You are a strong fit for data roles.",
        job_opportunities=[],
        skill_gaps=[],
        upskill_resources=[],
        next_role_target="Senior Data Analyst",
        chips=["What skills should I learn?", "Show me local jobs"],
    )
    assert len(response.chips) == 2
    assert response.next_role_target == "Senior Data Analyst"
