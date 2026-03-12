"""Request/response schemas for the Career API."""

from pydantic import BaseModel


class CareerAnalyzeRequest(BaseModel):
    cv_version_id: str
    citizen_id: str


class CareerAnalyzeResponse(BaseModel):
    job_id: str


class CareerChatRequest(BaseModel):
    message: str
    career_context_id: str
    citizen_id: str
