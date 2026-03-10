"""Pydantic structured output schemas for the citizen agent."""

from pydantic import BaseModel, Field


class ServiceItem(BaseModel):
    """A single civic service returned by the agent."""

    title: str = Field(description="Name of the service or organization")
    description: str = Field(description="Brief description of what they offer")
    category: str | None = Field(
        default=None,
        description="Service category: health, childcare, education, community, etc.",
    )
    phone: str | None = Field(default=None, description="Phone number")
    address: str | None = Field(default=None, description="Physical address")
    url: str | None = Field(default=None, description="Website URL")
    hours: str | None = Field(
        default=None,
        description="Operating hours, e.g. 'Mon-Fri 8am-5pm'",
    )
    wait_time: str | None = Field(
        default=None,
        description="Expected wait or processing time, e.g. '45 days', '30 min walk-in'",
    )
    what_to_bring: list[str] = Field(
        default_factory=list,
        description="Documents or items to bring for a visit",
    )
    programs: list[str] = Field(
        default_factory=list,
        description="Specific programs offered at this location",
    )


class CitizenAgentResponse(BaseModel):
    """Structured output the citizen agent LLM must produce."""

    answer: str = Field(
        description="The conversational answer with bullets, phone numbers, and details",
    )
    services: list[ServiceItem] = Field(
        default_factory=list,
        description="Structured service cards for every service mentioned in the answer",
    )
    chips: list[str] = Field(
        default_factory=list,
        description="2-3 short follow-up suggestion phrases (under 8 words each)",
    )
