"""Geocoding helpers: Nominatim, ArcGIS Business License, SERP Maps, jittered fallback."""

import hashlib
import json
import logging
import math
import re
import time
import urllib.parse
import urllib.request

from backend.config import ARCGIS_BASE
from backend.core.data_scraping.geo.constants import (
    MONTGOMERY_CENTER,
    MONTGOMERY_BOUNDS,
    MONTGOMERY_NEIGHBORHOODS,
    MONTGOMERY_LANDMARKS,
    LOCATION_PATTERNS,
    CITY_LEVEL_KEYWORDS,
)

logger = logging.getLogger("geocoding")


# ---------------------------------------------------------------------------
# Nominatim (OSM)
# ---------------------------------------------------------------------------

def geocode_nominatim(address: str) -> tuple[float, float] | None:
    """Geocode via OpenStreetMap Nominatim. Returns (lat, lng) or None."""
    query = urllib.parse.quote(address)
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={query}&format=json&limit=1&countrycodes=us"
    )
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "MontgomeryAI-Hackathon/1.0")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read().decode())
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# ArcGIS Business License (Montgomery GIS)
# ---------------------------------------------------------------------------

def geocode_arcgis_business(company_name: str) -> tuple[float, float, str, str] | None:
    """Search ArcGIS Business Licenses for company coordinates.

    Returns (lat, lng, company_name, address) or None.
    """
    clean = company_name.upper().split(",")[0].strip()
    for suffix in [" INC", " LLC", " CORP", " CO", " LTD"]:
        clean = clean.replace(suffix, "")
    clean = clean.strip()

    if len(clean) < 3:
        return None

    encoded = urllib.parse.quote(clean)
    url = (
        f"{ARCGIS_BASE}/HostedDatasets/Business_License/FeatureServer/0/query"
        f"?where=custCOMPANY_NAME+LIKE+%27%25{encoded}%25%27"
        f"&outFields=custCOMPANY_NAME,Full_Address"
        f"&outSR=4326&f=geojson&resultRecordCount=1"
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            features = data.get("features", [])
            if features:
                coords = features[0]["geometry"]["coordinates"]
                name = features[0]["properties"].get("custCOMPANY_NAME", "")
                addr = features[0]["properties"].get("Full_Address", "")
                return coords[1], coords[0], name, addr
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# SERP Maps (Bright Data Google Maps)
# ---------------------------------------------------------------------------

def is_within_montgomery(lat: float, lng: float) -> bool:
    """Check if coordinates fall within Montgomery metro area."""
    return (
        MONTGOMERY_BOUNDS["lat_min"] <= lat <= MONTGOMERY_BOUNDS["lat_max"]
        and MONTGOMERY_BOUNDS["lng_min"] <= lng <= MONTGOMERY_BOUNDS["lng_max"]
    )


def geocode_serp_maps(location_text: str) -> dict | None:
    """Resolve a location string to coordinates via Google Maps SERP."""
    from backend.core.bright_data_client import serp_maps_search

    query = f"{location_text} Montgomery Alabama"
    body = serp_maps_search(query)

    if not body:
        return None

    results = body.get("results", [])
    if not results:
        return None

    top = results[0]
    coords = top.get("gps_coordinates") or top.get("coordinates") or {}
    lat = coords.get("latitude") or coords.get("lat") or top.get("latitude")
    lng = coords.get("longitude") or coords.get("lng") or top.get("longitude")

    if lat is None or lng is None:
        return None

    lat, lng = float(lat), float(lng)

    if not is_within_montgomery(lat, lng):
        logger.info("Outside bounds: %s → (%s, %s)", location_text, lat, lng)
        return None

    address = top.get("address") or top.get("formatted_address") or ""
    neighborhood = _match_neighborhood(location_text, address)

    return {"lat": lat, "lng": lng, "address": address, "neighborhood": neighborhood}


def _match_neighborhood(query: str, address: str) -> str:
    """Try to match a neighborhood name from query or address."""
    combined = f"{query} {address}".lower()
    for name in MONTGOMERY_NEIGHBORHOODS:
        if name.lower() in combined:
            return name
    return "Montgomery"


# ---------------------------------------------------------------------------
# Jittered city center fallback
# ---------------------------------------------------------------------------

def build_jittered_city_center(article_id: str) -> dict:
    """Generate a deterministic jittered coordinate near city center.

    Uses article ID hash so the same article always gets the same
    position, spreading pins across downtown instead of stacking.
    """
    digest = hashlib.md5(article_id.encode()).hexdigest()
    angle = int(digest[:8], 16) / 0xFFFFFFFF * 2 * math.pi
    radius = (int(digest[8:16], 16) / 0xFFFFFFFF) * 0.02

    lat = MONTGOMERY_CENTER[0] + radius * math.cos(angle)
    lng = MONTGOMERY_CENTER[1] + radius * math.sin(angle)

    return {
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "address": "Montgomery, AL",
        "neighborhood": "Montgomery",
    }


# ---------------------------------------------------------------------------
# Location extraction (for news articles)
# ---------------------------------------------------------------------------

def extract_location_mentions(title: str, excerpt: str) -> list[str]:
    """Extract specific location mentions (neighborhoods, streets, landmarks)."""
    text = f"{title} {excerpt}"
    text_lower = text.lower()
    mentions: list[str] = []

    for neighborhood in MONTGOMERY_NEIGHBORHOODS:
        if neighborhood.lower() in text_lower:
            mentions.append(neighborhood)

    for landmark in MONTGOMERY_LANDMARKS:
        if landmark.lower() in text_lower:
            mentions.append(landmark)

    for pattern in LOCATION_PATTERNS:
        mentions.extend(re.findall(pattern, text))

    return list(dict.fromkeys(mentions))[:3]


def has_city_level_mention(title: str, excerpt: str) -> bool:
    """Check if article text mentions Montgomery at a city level."""
    text_lower = f"{title} {excerpt}".lower()
    return any(kw in text_lower for kw in CITY_LEVEL_KEYWORDS)
