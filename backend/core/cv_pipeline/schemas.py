"""Pydantic schemas for the CV pipeline."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class ExperienceEntry(BaseModel):
    """A single work experience entry."""

    role: str = Field(description="Job title / role name")
    company: str = Field(default="", description="Company or organization")
    duration: str = Field(default="", description="Time period (e.g. '2020-2023')")
    description: str = Field(default="", description="Brief summary of responsibilities")


class EducationEntry(BaseModel):
    """A single education entry."""

    institution: str = Field(description="School or university name")
    degree: str = Field(default="", description="Degree or certificate earned")
    year: str = Field(default="", description="Graduation year or period")


class PageAnalysis(BaseModel):
    """Extracted sections from a single CV page."""

    experience: list[ExperienceEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list, description="Technical / hard skills")
    soft_skills: list[str] = Field(default_factory=list, description="Soft skills")
    tools: list[str] = Field(default_factory=list, description="Tools and technologies")
    roles: list[str] = Field(default_factory=list, description="Job roles / titles found")
    education: list[EducationEntry] = Field(default_factory=list, description="Education entries")
    summary: str = Field(default="", description="Brief professional summary if found on this page")
    raw_text: str = Field(default="", description="Original page text for reference")


class CVAnalysisResult(BaseModel):
    """Aggregated analysis across all CV pages."""

    experience: list[ExperienceEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    summary: str = Field(default="")
    page_count: int = Field(default=0)


# ---------------------------------------------------------------------------
# Pipeline job tracking
# ---------------------------------------------------------------------------


class JobStatus(StrEnum):
    """Lifecycle states for a CV analysis job."""

    QUEUED = "queued"
    INGESTING = "ingesting"
    ANALYZING = "analyzing"
    AGGREGATING = "aggregating"
    COMPLETED = "completed"
    FAILED = "failed"


class PipelineEvent(BaseModel):
    """A single progress event emitted by the pipeline."""

    job_id: str
    status: JobStatus
    stage: str = Field(description="Human-readable stage label")
    page: int | None = Field(default=None, description="Current page (if in analysis)")
    total_pages: int | None = Field(default=None, description="Total pages discovered")
    detail: str = Field(default="", description="Extra info or error message")
    progress_pct: int = Field(default=0, description="0-100 overall progress")


class JobState(BaseModel):
    """Full persisted state for a pipeline job in Redis."""

    job_id: str
    citizen_id: str
    cv_upload_id: str
    file_path: str
    status: JobStatus = JobStatus.QUEUED
    total_pages: int = 0
    analyzed_pages: int = 0
    error: str = ""
    result: CVAnalysisResult | None = None
