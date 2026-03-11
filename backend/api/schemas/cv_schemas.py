"""Request/Response Pydantic schemas for CV upload and job tracking endpoints."""

from pydantic import BaseModel


class CVUploadResponse(BaseModel):
    """Returned after a successful CV file upload."""

    job_id: str
    cv_upload_id: str


class CVJobStatusResponse(BaseModel):
    """Current state of a CV analysis job."""

    job_id: str
    status: str
    stage: str
    progress_pct: int
    total_pages: int | None
    error: str
    result: dict | None
