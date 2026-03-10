"""Location helpers: jittered fallback, mention extraction, city-level checks."""

import hashlib
import logging
import math
import re

from backend.core.data_scraping.geo.constants import (
    MONTGOMERY_CENTER,
    MONTGOMERY_NEIGHBORHOODS,
    MONTGOMERY_LANDMARKS,
    LOCATION_PATTERNS,
    CITY_LEVEL_KEYWORDS,
)

logger = logging.getLogger("geocoding")


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
