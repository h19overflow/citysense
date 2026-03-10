"""Row converters for seeding JSON/GeoJSON data into the database.

article_to_row and feature_to_job_row are re-exported from scraper helpers
to avoid duplicating logic. Housing and service converters have no scraper
counterpart and live here.
"""

from datetime import datetime, timezone

from backend.core.data_scraping.scrapers.jobs_helpers import feature_to_row as feature_to_job_row
from backend.core.data_scraping.scrapers.news_helpers import article_to_row

_HOUSING_EXCLUDED = {"id", "address", "price"}

__all__ = ["article_to_row", "feature_to_job_row", "feature_to_housing_row", "service_to_row"]


def feature_to_housing_row(feature: dict) -> dict:
    """Convert GeoJSON Feature to housing_listings row dict."""
    props = feature.get("properties", {})
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates", [None, None])
    raw_price = props.get("price")
    try:
        price: int | None = int(str(raw_price).replace(",", "").replace("$", "")) if raw_price is not None else None
    except (ValueError, TypeError):
        price = None
    return {
        "id": props.get("id", ""),
        "address": props.get("address", ""),
        "price": price,
        "lat": coords[1] if len(coords) > 1 else None,
        "lng": coords[0] if len(coords) > 0 else None,
        "scraped_at": datetime.now(timezone.utc),
        "properties": {k: v for k, v in props.items() if k not in _HOUSING_EXCLUDED},
    }


def service_to_row(service: dict) -> dict:
    """Convert gov_services.json service dict to benefit_services row dict."""
    return {
        "id": service["id"],
        "category": service.get("category", ""),
        "title": service.get("title", ""),
        "provider": service.get("provider", ""),
        "description": service.get("description", ""),
        "url": service.get("url", ""),
        "phone": service.get("phone", ""),
        "scraped_at": datetime.now(timezone.utc),
        "details": {
            "eligibility": service.get("eligibility", []),
            "income_limits": service.get("income_limits", {}),
            "how_to_apply": service.get("how_to_apply", []),
            "documents_needed": service.get("documents_needed", []),
        },
    }
