"""Request/response schemas for the growth plan API."""

from pydantic import AnyHttpUrl, BaseModel, Field


class GrowthIntakeRequest(BaseModel):
    career_goal: str = Field(min_length=1)
    target_timeline: str = Field(min_length=1)
    learning_style: str = Field(min_length=1)
    current_frustrations: str = Field(min_length=1)
    external_links: list[AnyHttpUrl] = Field(default_factory=list)


class GapAnswersRequest(BaseModel):
    preliminary_analysis_id: str = Field(min_length=1)
    gap_answers: dict[str, str]  # question_id -> answer text
