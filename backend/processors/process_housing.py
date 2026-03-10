"""Process Zillow listings into GeoJSON for the housing map layer."""

import hashlib
import json
import time
from datetime import datetime, timezone

from backend.config import OUTPUT_FILES
from backend.processors.geocoding_utils import geocode_nominatim


def generate_listing_id(listing: dict) -> str:
    """Generate stable dedup ID from address + price."""
    key = f"{listing.get('address', '')}__{listing.get('price', '')}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def format_price(price) -> str:
    """Format price as human-readable string."""
    if not price:
        return ""
    try:
        num = int(str(price).replace(",", "").replace("$", ""))
        return f"${num:,}"
    except (ValueError, TypeError):
        return str(price)


def process_zillow_listings(raw_listings: list[dict]) -> list[dict]:
    """Build GeoJSON features from Zillow scraper output."""
    features: list[dict] = []
    geocode_cache: dict[str, tuple[float, float] | None] = {}

    for listing in raw_listings:
        if listing.get("error"):
            continue

        address = listing.get("address") or listing.get("streetAddress") or ""
        city = listing.get("city") or "Montgomery"
        state = listing.get("state") or "AL"
        full_address = f"{address}, {city}, {state}" if address else ""

        lat = listing.get("latitude")
        lng = listing.get("longitude")

        if not lat or not lng:
            if full_address and full_address not in geocode_cache:
                geocode_cache[full_address] = geocode_nominatim(full_address)
                time.sleep(1)
            coords = geocode_cache.get(full_address)
            if coords:
                lat, lng = coords

        if not lat or not lng:
            continue

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "id": generate_listing_id(listing),
                "address": full_address,
                "price": listing.get("price") or listing.get("unformattedPrice"),
                "price_formatted": format_price(listing.get("price")),
                "beds": listing.get("bedrooms") or listing.get("beds"),
                "baths": listing.get("bathrooms") or listing.get("baths"),
                "sqft": listing.get("livingArea") or listing.get("area"),
                "listing_type": listing.get("homeType") or listing.get("listingType", ""),
                "status": listing.get("homeStatus") or listing.get("listingStatus", ""),
                "url": listing.get("url") or listing.get("detailUrl", ""),
                "image_url": listing.get("imgSrc") or listing.get("image", ""),
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            },
        })

    return features


def save_housing_results(features: list[dict]) -> None:
    """Save housing GeoJSON to public/data/housing.geojson."""
    path = OUTPUT_FILES["housing"]
    existing_features: list[dict] = []
    if path.exists():
        with open(path, encoding="utf-8") as f:
            existing = json.load(f)
            existing_features = existing.get("features", [])

    existing_ids = {f["properties"]["id"] for f in existing_features}
    new_features = [f for f in features if f["properties"]["id"] not in existing_ids]
    merged = new_features + existing_features

    geojson = {"type": "FeatureCollection", "features": merged}
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"Saved {len(merged)} housing listings to {path} ({len(new_features)} new)")
