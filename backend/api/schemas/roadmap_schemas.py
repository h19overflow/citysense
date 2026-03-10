"""Pydantic schemas for roadmap generation requests and responses."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model that accepts/returns camelCase JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


class RoadmapLocation(CamelModel):
    """Office details for an in-person step."""

    name: str
    address: str
    hours: str = ""
    phone: str | None = None


class RoadmapStep(CamelModel):
    """A single roadmap step returned to the frontend."""

    id: str
    step_number: int
    title: str
    action: str
    documents: list[str] = Field(default_factory=list)
    location: RoadmapLocation | None = None
    estimated_time: str
    pro_tip: str | None = None
    can_do_online: bool = False
    online_url: str | None = None


class PersonalizedRoadmap(CamelModel):
    """Full roadmap payload consumed by the frontend."""

    id: str
    service_id: str
    service_title: str
    service_category: str
    eligibility_note: str
    total_estimated_time: str
    steps: list[RoadmapStep]
    generated_at: str


class CitizenCivicData(CamelModel):
    """Subset of the citizen profile needed for roadmap personalization."""

    zip: str | None = None
    household_size: int | None = None
    income: float | None = None
    income_source: str | None = None
    housing_type: str | None = None
    monthly_rent: float | None = None
    has_vehicle: bool | None = None
    children: int | None = None
    children_ages: list[int] | None = None
    veteran_status: bool = False
    disability_status: bool = False
    citizenship_status: str | None = "citizen"
    needs_housing_help: bool = False
    needs_utility_help: bool = False
    neighborhood: str | None = None
    needs_childcare: bool = False
    needs_legal_help: bool = False
    health_insurance: str | None = None
    primary_transport: str | None = None


class CitizenMeta(CamelModel):
    """Citizen profile mirrored from the frontend contract."""

    id: str
    persona: str
    tagline: str
    avatar_initials: str | None = None
    avatar_color: str | None = None
    goals: list[str] = Field(default_factory=list)
    barriers: list[str] = Field(default_factory=list)
    civic_data: CitizenCivicData


class RoadmapRequest(CamelModel):
    """Request body for roadmap generation."""

    service_id: str = Field(min_length=1)
    citizen: CitizenMeta | None = None


class RoadmapStepDraft(CamelModel):
    """Structured LLM output for one roadmap step before IDs are assigned."""

    step_number: int
    title: str
    action: str
    documents: list[str] = Field(default_factory=list)
    location: RoadmapLocation | None = None
    estimated_time: str
    pro_tip: str | None = None
    can_do_online: bool = False
    online_url: str | None = None


class RoadmapDraft(CamelModel):
    """Structured LLM output for a service roadmap."""

    eligibility_note: str = ""
    total_estimated_time: str = "Varies"
    steps: list[RoadmapStepDraft] = Field(default_factory=list)
