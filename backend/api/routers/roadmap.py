"""Roadmap generation endpoint."""

from fastapi import APIRouter, HTTPException

from backend.agents.citizen.roadmap_agent import generate_personalized_roadmap
from backend.api.schemas.roadmap_schemas import PersonalizedRoadmap, RoadmapRequest

router = APIRouter(tags=["roadmap"])


@router.post("/roadmap/generate", response_model=PersonalizedRoadmap)
def generate_roadmap(request: RoadmapRequest) -> PersonalizedRoadmap:
    """Generate a personalized or generic roadmap for a civic service."""
    try:
        return generate_personalized_roadmap(
            citizen=request.citizen,
            service_id=request.service_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Roadmap generation failed.") from exc
