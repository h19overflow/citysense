"""Pydantic schemas for the Career Agent response."""

from pydantic import BaseModel


class JobOpportunity(BaseModel):
    title: str
    company: str
    source: str           # "local_db" | "web"
    url: str | None
    match_percent: int
    matched_skills: list[str]
    missing_skills: list[str]


class SkillGap(BaseModel):
    skill: str
    importance: str       # "critical" | "high" | "medium"
    target_roles: list[str]


class UpskillResource(BaseModel):
    skill: str
    resource_name: str
    provider: str         # e.g. "Trenholm State", "Coursera"
    url: str | None
    is_local: bool


class CareerAgentResponse(BaseModel):
    summary: str
    job_opportunities: list[JobOpportunity]
    skill_gaps: list[SkillGap] = []
    upskill_resources: list[UpskillResource] = []
    next_role_target: str
    chips: list[str]
