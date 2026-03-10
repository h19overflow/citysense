"""Data loading and formatting helpers for civic and government service files.

Reads local JSON/GeoJSON files and provides filter/format utilities.
Imported only by service_tools.py — not exposed to the agent directly.
"""

import json
import math
from pathlib import Path

from backend.config import REPO_ROOT

PUBLIC_DATA = REPO_ROOT / "frontend" / "public" / "data"
CIVIC_SERVICES_PATH = PUBLIC_DATA / "civic_services.geojson"
GOV_SERVICES_PATH = PUBLIC_DATA / "gov_services.json"
MAX_SEARCH_RESULTS = 10
MAX_NEARBY_RESULTS = 5

NEIGHBORHOOD_CENTERS: dict[str, tuple[float, float]] = {
    "Downtown": (32.3792, -86.3077),
    "Capitol Heights": (32.3650, -86.2850),
    "Cloverdale": (32.3510, -86.2970),
    "Old Cloverdale": (32.3490, -86.2980),
    "Midtown": (32.3700, -86.3010),
    "Garden District": (32.3550, -86.3050),
    "Chisholm": (32.3400, -86.2800),
    "Dalraida": (32.4050, -86.2700),
    "Pike Road": (32.3300, -86.2400),
    "Prattville": (32.4640, -86.4600),
}


_civic_cache: list[dict] | None = None
_gov_cache: list[dict] | None = None


def load_civic_features() -> list[dict]:
    """Load all features from civic_services.geojson (cached after first load)."""
    global _civic_cache
    if _civic_cache is None:
        data = json.loads(CIVIC_SERVICES_PATH.read_text(encoding="utf-8"))
        _civic_cache = data.get("features", [])
    return _civic_cache


def load_gov_services() -> list[dict]:
    """Load the services list from gov_services.json (cached after first load)."""
    global _gov_cache
    if _gov_cache is None:
        data = json.loads(GOV_SERVICES_PATH.read_text(encoding="utf-8"))
        _gov_cache = data.get("services", [])
    return _gov_cache


def match_civic_category(props: dict, category: str) -> bool:
    """Return True if a feature's category or subcategory matches the term."""
    term = category.lower()
    return (
        term in props.get("category", "").lower()
        or term in props.get("subcategory", "").lower()
    )


def match_civic_keyword(props: dict, keyword: str) -> bool:
    """Return True if the feature's name, address, or programs contain the keyword."""
    term = keyword.lower()
    programs = " ".join(props.get("programs", []))
    searchable = " ".join([props.get("name", ""), props.get("address", ""), programs]).lower()
    return term in searchable


def format_civic_feature(props: dict) -> str:
    """Format a single civic feature as a readable multi-line summary."""
    parts = [f"- {props.get('name', 'Unknown')} | {props.get('address', 'No address')}"]
    if props.get("phone"):
        parts.append(f"  Phone: {props['phone']}")
    if props.get("hours"):
        parts.append(f"  Hours: {props['hours']}")
    return "\n".join(parts)


def format_gov_service_details(service: dict) -> str:
    """Format a gov_services.json entry as a full eligibility/how-to-apply block."""
    eligibility = "\n  ".join(service.get("eligibility", []))
    steps = "\n  ".join(service.get("how_to_apply", []))
    docs = "\n  ".join(service.get("documents_needed", []))
    return (
        f"**{service['title']}**\n"
        f"{service.get('description', '')}\n\n"
        f"Eligibility:\n  {eligibility}\n\n"
        f"How to Apply:\n  {steps}\n\n"
        f"Documents Needed:\n  {docs}\n\n"
        f"Phone: {service.get('phone', 'N/A')}\n"
        f"URL: {service.get('url', 'N/A')}"
    )


def format_civic_service_details(props: dict) -> str:
    """Format a civic_services.geojson feature as a detail block."""
    programs = ", ".join(props.get("programs", []))
    return (
        f"**{props['name']}**\n"
        f"Address: {props.get('address', 'N/A')}\n"
        f"Phone: {props.get('phone', 'N/A')}\n"
        f"Hours: {props.get('hours', 'N/A')}\n"
        f"Programs: {programs}\n"
        f"Website: {props.get('website', 'N/A')}"
    )


def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate approximate distance in km using flat-earth projection."""
    delta_lat = (lat2 - lat1) * 111.0
    delta_lng = (lng2 - lng1) * 111.0 * math.cos(math.radians(lat1))
    return math.sqrt(delta_lat ** 2 + delta_lng ** 2)
