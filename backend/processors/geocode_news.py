"""Geocode news articles using Bright Data Google Maps SERP.

Extracts location mentions from article text and resolves
them to lat/lng coordinates within Montgomery, AL.

Strategy (3-tier):
  1. Specific location (neighborhood/street/landmark) → SERP Maps API
  2. City-level mention ("Montgomery", "Alabama State") → jittered city center
  3. No location mention → skip (location stays absent)
"""

import hashlib
import logging
import math
import re
import time

from backend.core.bright_data_client import serp_maps_search
from backend.processors.geocoding_constants import (
    MONTGOMERY_CENTER,
    MONTGOMERY_BOUNDS,
    MONTGOMERY_NEIGHBORHOODS,
    MONTGOMERY_LANDMARKS,
    CITY_LEVEL_KEYWORDS,
    LOCATION_PATTERNS,
)

logger = logging.getLogger("geocode_news")


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


def is_within_montgomery(lat: float, lng: float) -> bool:
    """Check if coordinates fall within Montgomery metro area."""
    return (
        MONTGOMERY_BOUNDS["lat_min"] <= lat <= MONTGOMERY_BOUNDS["lat_max"]
        and MONTGOMERY_BOUNDS["lng_min"] <= lng <= MONTGOMERY_BOUNDS["lng_max"]
    )


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


def geocode_location(location_text: str) -> dict | None:
    """Resolve a location string to coordinates via Google Maps SERP."""
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

    return {
        "lat": lat,
        "lng": lng,
        "address": address,
        "neighborhood": neighborhood,
    }


def _match_neighborhood(query: str, address: str) -> str:
    """Try to match a neighborhood name from query or address."""
    combined = f"{query} {address}".lower()
    for name in MONTGOMERY_NEIGHBORHOODS:
        if name.lower() in combined:
            return name
    return "Montgomery"


def _needs_geocoding(article: dict) -> bool:
    """Check if article still needs geocoding.

    Articles with a valid location dict are skipped.
    Articles with location=None or missing location field are processed.
    """
    loc = article.get("location")
    if isinstance(loc, dict) and loc.get("lat") is not None:
        return False
    return True


def geocode_articles(
    articles: list[dict],
    max_geocode: int = 500,
) -> list[dict]:
    """Add location data to articles using 3-tier strategy.

    Tier 1: Specific mention → SERP Maps API (most precise)
    Tier 2: City-level mention → jittered city center (spread across downtown)
    Tier 3: No specific mention → jittered city center (all scraped
            articles are Montgomery-relevant by definition)
    """
    api_calls = 0
    tier1_count = 0
    tier2_count = 0

    for article in articles:
        if not _needs_geocoding(article):
            continue

        title = article.get("title", "")
        excerpt = article.get("excerpt", "")
        specific_mentions = extract_location_mentions(title, excerpt)

        # Tier 1: specific location → SERP Maps API
        if specific_mentions and api_calls < max_geocode:
            location = None
            for mention in specific_mentions:
                api_calls += 1
                location = geocode_location(mention)
                if location:
                    break
                time.sleep(1)
            if location:
                article["location"] = location
                tier1_count += 1
                continue

        # Tier 2+3: any remaining article → jittered city center
        article_id = article.get("id", title)
        article["location"] = build_jittered_city_center(article_id)
        tier2_count += 1

    total_located = sum(1 for a in articles if a.get("location"))
    logger.info(
        "Geocoding complete: %d API calls, %d precise, %d city-center, "
        "%d/%d total located",
        api_calls, tier1_count, tier2_count,
        total_located, len(articles),
    )
    return articles
