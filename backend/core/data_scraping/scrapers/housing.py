"""Housing scraper — Zillow rentals via Bright Data Web Scraper API."""

import time
from datetime import datetime, timezone

from backend.config import DATASETS, OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.geo import geocode_nominatim
from backend.core.data_scraping.bright_data_client import trigger_and_collect


class HousingScraper(BaseScraper):
    name = "housing"
    output_file = OUTPUT_FILES["housing"]
    event_type = "housing"
    output_format = "geojson"

    def fetch(self) -> list[dict]:
        payload = [{"url": "https://www.zillow.com/montgomery-al/rentals/"}]
        params = {"type": "discover_new", "discover_by": "url", "limit_per_input": "100"}
        return trigger_and_collect(
            dataset_id=DATASETS["zillow"],
            payload=payload,
            params=params,
        )

    def process(self, raw_data: list[dict]) -> list[dict]:
        geocode_cache: dict[str, tuple[float, float] | None] = {}
        features: list[dict] = []

        for listing in raw_data:
            if listing.get("error"):
                continue
            feature = self._build_feature(listing, geocode_cache)
            if feature:
                features.append(feature)
        return features

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("address", ""),
            str(record.get("price", "")),
        )

    def _build_feature(self, listing: dict, geocode_cache: dict) -> dict | None:
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
            return None

        return {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "id": self.generate_id(listing),
                "address": full_address,
                "price": listing.get("price") or listing.get("unformattedPrice"),
                "price_formatted": self._format_price(listing.get("price")),
                "beds": listing.get("bedrooms") or listing.get("beds"),
                "baths": listing.get("bathrooms") or listing.get("baths"),
                "sqft": listing.get("livingArea") or listing.get("area"),
                "listing_type": listing.get("homeType") or listing.get("listingType", ""),
                "status": listing.get("homeStatus") or listing.get("listingStatus", ""),
                "url": listing.get("url") or listing.get("detailUrl", ""),
                "image_url": listing.get("imgSrc") or listing.get("image", ""),
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    @staticmethod
    def _format_price(price) -> str:
        if not price:
            return ""
        try:
            num = int(str(price).replace(",", "").replace("$", ""))
            return f"${num:,}"
        except (ValueError, TypeError):
            return str(price)
