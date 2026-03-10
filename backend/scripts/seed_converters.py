"""Row converters for seeding JSON/GeoJSON data into the database."""

from datetime import datetime, timezone

_JOB_EXCLUDED = {"id", "title", "company", "source", "address", "url"}
_HOUSING_EXCLUDED = {"id", "address", "price"}


def article_to_row(article: dict) -> dict:
    """Convert camelCase news article dict to DB column dict."""
    try:
        scraped_at = datetime.fromisoformat(article.get("scrapedAt", ""))
    except (ValueError, TypeError):
        scraped_at = datetime.now(timezone.utc)
    return {
        "id": article["id"],
        "title": article.get("title", ""),
        "excerpt": article.get("excerpt", ""),
        "body": article.get("body", ""),
        "source": article.get("source", ""),
        "source_url": article.get("sourceUrl", ""),
        "image_url": article.get("imageUrl"),
        "category": article.get("category", "general"),
        "published_at": article.get("publishedAt", ""),
        "scraped_at": scraped_at,
        "upvotes": article.get("upvotes", 0),
        "downvotes": article.get("downvotes", 0),
        "comment_count": article.get("commentCount", 0),
        "sentiment": article.get("sentiment"),
        "sentiment_score": article.get("sentimentScore"),
        "misinfo_risk": article.get("misinfoRisk"),
        "summary": article.get("summary"),
        "location": article.get("location"),
        "reaction_counts": article.get("reactionCounts"),
    }


def feature_to_job_row(feature: dict) -> dict:
    """Convert GeoJSON Feature to job_listings row dict."""
    props = feature.get("properties", {})
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates", [None, None])
    return {
        "id": props.get("id", ""),
        "title": props.get("title", ""),
        "company": props.get("company", ""),
        "source": props.get("source", ""),
        "address": props.get("address", ""),
        "lat": coords[1] if len(coords) > 1 else None,
        "lng": coords[0] if len(coords) > 0 else None,
        "url": props.get("url", ""),
        "scraped_at": datetime.now(timezone.utc),
        "properties": {k: v for k, v in props.items() if k not in _JOB_EXCLUDED},
    }


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
