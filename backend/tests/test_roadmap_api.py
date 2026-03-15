"""Tests for POST /api/roadmap/generate endpoint."""

import pytest
from unittest.mock import MagicMock, patch

from backend.tests.conftest import test_client  # noqa: F401
from backend.api.schemas.roadmap_schemas import PersonalizedRoadmap, RoadmapStep

_VALID_CITIZEN = {
    "id": "citizen-1",
    "persona": "Working Parent",
    "tagline": "Needs help fast",
    "avatarInitials": "WP",
    "avatarColor": "#abc",
    "goals": ["Find housing"],
    "barriers": ["No car"],
    "civicData": {
        "zip": "36104",
        "householdSize": 3,
        "income": 2000.0,
        "incomeSource": "employment",
        "housingType": "renting",
        "monthlyRent": 800.0,
        "hasVehicle": False,
        "children": 1,
        "childrenAges": [5],
        "veteranStatus": False,
        "disabilityStatus": False,
        "citizenshipStatus": "citizen",
        "needsHousingHelp": True,
        "needsUtilityHelp": False,
        "neighborhood": "Downtown",
        "needsChildcare": False,
        "needsLegalHelp": False,
        "healthInsurance": "medicaid",
        "primaryTransport": "public transit",
    },
}


def _fake_roadmap() -> PersonalizedRoadmap:
    step = RoadmapStep(
        id="step-1-svc-medicaid-al",
        step_number=1,
        title="Apply Online",
        action="Go to the website and fill in the form.",
        documents=[],
        location=None,
        estimated_time="30 min",
        pro_tip=None,
        can_do_online=True,
        online_url="https://medicaid.al.gov",
    )
    return PersonalizedRoadmap(
        id="roadmap-svc-medicaid-al-citizen-1-1234567890",
        service_id="svc-medicaid-al",
        service_title="Alabama Medicaid",
        service_category="health",
        eligibility_note="You appear eligible based on your income.",
        total_estimated_time="1 hour",
        steps=[step],
        generatedAt="2026-01-01T00:00:00Z",
    )


@pytest.mark.unit
class TestRoadmapGenerateHappyPath:
    def test_returns_200_with_steps(self, test_client):
        """Valid request with a known service_id and citizen returns 200 with steps."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            return_value=_fake_roadmap(),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "svc-medicaid-al", "citizen": _VALID_CITIZEN},
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["steps"]) == 1
        assert data["serviceId"] == "svc-medicaid-al"

    def test_returns_200_without_citizen_for_generic_roadmap(self, test_client):
        """Request with no citizen field returns 200 (generic roadmap path)."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            return_value=_fake_roadmap(),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "svc-medicaid-al"},
            )

        assert response.status_code == 200

    def test_response_contains_required_roadmap_fields(self, test_client):
        """Successful response includes id, serviceId, steps, and generatedAt."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            return_value=_fake_roadmap(),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "svc-medicaid-al"},
            )

        data = response.json()
        for field in ("id", "serviceId", "steps", "generatedAt", "totalEstimatedTime"):
            assert field in data, f"Missing field: {field}"


@pytest.mark.unit
class TestRoadmapGenerateValidation:
    def test_missing_service_id_returns_422(self, test_client):
        """Request without serviceId returns 422."""
        response = test_client.post(
            "/api/roadmap/generate",
            json={"citizen": _VALID_CITIZEN},
        )
        assert response.status_code == 422

    def test_empty_service_id_returns_422(self, test_client):
        """Empty string serviceId fails min_length=1 validation and returns 422."""
        response = test_client.post(
            "/api/roadmap/generate",
            json={"serviceId": ""},
        )
        assert response.status_code == 422


@pytest.mark.unit
class TestRoadmapGenerateAgentFailure:
    def test_unknown_service_id_returns_404(self, test_client):
        """When service_id is not found, the endpoint returns 404."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            side_effect=ValueError("Service 'svc-unknown' not found."),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "svc-unknown"},
            )

        assert response.status_code == 404

    def test_runtime_error_returns_503(self, test_client):
        """When the agent raises RuntimeError (e.g. missing data file), returns 503."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            side_effect=RuntimeError("gov_services.json not found"),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "svc-medicaid-al"},
            )

        assert response.status_code == 503

    def test_unexpected_exception_returns_500(self, test_client):
        """When an unexpected exception occurs, the endpoint returns 500."""
        with patch(
            "backend.api.routers.roadmap.generate_personalized_roadmap",
            side_effect=Exception("DB exploded"),
        ):
            response = test_client.post(
                "/api/roadmap/generate",
                json={"serviceId": "svc-medicaid-al"},
            )

        assert response.status_code == 500
