"""Contract tests for CV Pydantic response schemas.

Covers: CVUploadResponse, CVJobStatusResponse.
"""

from __future__ import annotations

import pydantic
import pytest

from backend.api.schemas.cv_schemas import CVJobStatusResponse, CVUploadResponse


# ---------------------------------------------------------------------------
# CVUploadResponse
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestCVUploadResponseSchema:
    def test_round_trip_preserves_all_fields(self) -> None:
        """CVUploadResponse serialises and deserialises without data loss."""
        original = CVUploadResponse(job_id="j-1", cv_upload_id="u-2")
        restored = CVUploadResponse.model_validate(original.model_dump())
        assert restored.job_id == "j-1"
        assert restored.cv_upload_id == "u-2"

    def test_missing_job_id_raises_validation_error(self) -> None:
        """CVUploadResponse requires job_id — absent field must raise."""
        with pytest.raises(pydantic.ValidationError):
            CVUploadResponse.model_validate({"cv_upload_id": "u-2"})

    def test_missing_cv_upload_id_raises_validation_error(self) -> None:
        """CVUploadResponse requires cv_upload_id — absent field must raise."""
        with pytest.raises(pydantic.ValidationError):
            CVUploadResponse.model_validate({"job_id": "j-1"})


# ---------------------------------------------------------------------------
# CVJobStatusResponse
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestCVJobStatusResponseSchema:
    def test_round_trip_with_null_optional_fields(self) -> None:
        """CVJobStatusResponse round-trips correctly when optional fields are null."""
        payload = {
            "job_id": "j-1",
            "status": "queued",
            "stage": "queued",
            "progress_pct": 0,
            "total_pages": None,
            "error": "",
            "result": None,
        }
        model = CVJobStatusResponse.model_validate(payload)
        assert model.job_id == "j-1"
        assert model.total_pages is None
        assert model.result is None

    def test_round_trip_with_populated_result(self) -> None:
        """CVJobStatusResponse round-trips correctly when result is provided."""
        payload = {
            "job_id": "j-2",
            "status": "completed",
            "stage": "completed",
            "progress_pct": 100,
            "total_pages": 3,
            "error": "",
            "result": {
                "skills": ["Python"],
                "roles": [],
                "tools": [],
                "soft_skills": [],
                "experience": [],
                "page_count": 3,
            },
        }
        model = CVJobStatusResponse.model_validate(payload)
        assert model.result is not None
        assert "Python" in model.result["skills"]

    def test_progress_pct_reflects_completed_status(self) -> None:
        """progress_pct of 100 must co-exist with status=completed."""
        payload = {
            "job_id": "j-3",
            "status": "completed",
            "stage": "completed",
            "progress_pct": 100,
            "total_pages": 2,
            "error": "",
            "result": None,
        }
        model = CVJobStatusResponse.model_validate(payload)
        assert model.progress_pct == 100
        assert model.status == "completed"
