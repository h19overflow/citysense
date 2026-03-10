"""Map command tools for the citizen agent.

Each function returns a JSON string representing a MapCommand object
that the frontend interprets to update the civic services map.

MapCommand shape:
  id: str (uuid)
  type: "filter_category" | "zoom_to" | "highlight_hotspots" | "clear"
  category?: str
  lat?: float
  lng?: float
  zoom?: int
  label?: str
"""

import json
import uuid


def filter_map_category(category: str) -> str:
    """Return a MapCommand that filters the map to a single service category."""
    command = {
        "id": str(uuid.uuid4()),
        "type": "filter_category",
        "category": category.lower(),
    }
    return json.dumps(command)


def zoom_to_location(lat: float, lng: float, label: str) -> str:
    """Return a MapCommand that zooms the map to a specific lat/lng."""
    command = {
        "id": str(uuid.uuid4()),
        "type": "zoom_to",
        "lat": lat,
        "lng": lng,
        "zoom": 15,
        "label": label,
    }
    return json.dumps(command)


def clear_map_filters() -> str:
    """Return a MapCommand that clears all active map filters."""
    command = {
        "id": str(uuid.uuid4()),
        "type": "clear",
    }
    return json.dumps(command)
