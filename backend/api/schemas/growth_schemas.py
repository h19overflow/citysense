"""Request/response schemas for the growth plan API."""

from pydantic import BaseModel


class GrowthIntakeRequest(BaseModel):
    career_goal: str
    target_timeline: str
    learning_style: str
    current_frustrations: str
    external_links: list[str] = []


class GapAnswersRequest(BaseModel):
    preliminary_analysis_id: str
    gap_answers: dict[str, str]  # question_id → answer text
