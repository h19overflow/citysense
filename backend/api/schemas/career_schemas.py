"""Request/response schemas for the Career API."""

from typing import Literal

from pydantic import BaseModel


class CareerAnalyzeRequest(BaseModel):
    cv_upload_id: str
    citizen_id: str


class CareerAnalyzeResponse(BaseModel):
    job_id: str


class ChatTurn(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class CareerChatRequest(BaseModel):
    message: str
    career_context_id: str
    citizen_id: str
    history: list[ChatTurn] = []
    # Growth Guide mode fields (all optional)
    growth_mode: bool = False
    active_roadmap_analysis_id: str | None = None
    active_roadmap_path_key: Literal["fill_gap", "multidisciplinary", "pivot"] | None = None
    discuss_context: str | None = None
