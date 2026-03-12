"""Tests for career analyze API endpoint."""

from backend.tests.conftest import test_client  # noqa: F401


def test_analyze_returns_job_id(test_client):
    response = test_client.post(
        "/api/career/analyze",
        json={"cv_upload_id": "cv-123", "citizen_id": "user-456"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert isinstance(data["job_id"], str)


def test_analyze_missing_cv_upload_id_returns_422(test_client):
    response = test_client.post(
        "/api/career/analyze",
        json={"citizen_id": "user-456"},
    )
    assert response.status_code == 422
