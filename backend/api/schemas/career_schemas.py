"""Request/response schemas for the Career API."""

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
