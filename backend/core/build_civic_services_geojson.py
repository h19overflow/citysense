"""
Build structured GeoJSON for Montgomery civic services.

Reads service data from backend/data/civic_services_raw.json, geocodes each
location via Nominatim, and writes a GeoJSON FeatureCollection that matches
the same format as the job pipeline output so both layers render on the same
Leaflet map.
"""

import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

from backend.config import SCRIPTS_DATA

CIVIC_SERVICES_RAW = SCRIPTS_DATA / "civic_services_raw.json"


def load_services() -> list[dict]:
    """Load civic service records from the raw JSON data file."""
    with open(CIVIC_SERVICES_RAW, encoding="utf-8") as f:
        return json.load(f)


def geocode_address(address: str) -> tuple[float, float] | None:
    """Geocode an address via Nominatim. Returns (lat, lng) or None."""
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
    except Exception as e:
        print(f"  ERR geocoding '{address}': {e}")

    return None


def geocode_all_services(services: list[dict]) -> list[dict]:
    """Geocode all services, respecting Nominatim 1 req/sec rate limit."""
    cache: dict[str, tuple[float, float] | None] = {}

    for service in services:
        address = service.get("address", "")
        if not address:
            print(f"  SKIP (no address): {service['name']}")
            continue

        if address in cache:
            coords = cache[address]
        else:
            coords = geocode_address(address)
            cache[address] = coords
            time.sleep(1.1)

        if coords:
            service["lat"] = coords[0]
            service["lng"] = coords[1]
            name = service["name"][:40]
            print(f"  OK   {name:<40} -> {coords[0]:.5f}, {coords[1]:.5f}")
        else:
            print(f"  MISS {service['name'][:40]:<40} -> no coords for '{address}'")

    return services


def build_geojson_from_services(services: list[dict]) -> dict:
    """Build a GeoJSON FeatureCollection from geocoded service records."""
    features = []
    for svc in services:
        if "lat" not in svc:
            continue

        properties = {
            "name": svc["name"],
            "category": svc.get("category", ""),
            "subcategory": svc.get("subcategory", ""),
            "address": svc.get("address", ""),
            "phone": svc.get("phone", ""),
            "hours": svc.get("hours", ""),
            "website": svc.get("website", ""),
            "programs": svc.get("programs", []),
            "cost": svc.get("cost", ""),
            "apply_online": svc.get("apply_online", ""),
            "documents_needed": svc.get("documents_needed", []),
            "application_steps": svc.get("application_steps", []),
            "eligibility": svc.get("eligibility", {}),
        }

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [svc["lng"], svc["lat"]],
            },
            "properties": properties,
        })

    return {"type": "FeatureCollection", "features": features}


def print_summary(geojson: dict) -> None:
    """Print a category breakdown and coordinate table for the GeoJSON output."""
    categories: dict[str, int] = {}
    for feat in geojson["features"]:
        cat = feat["properties"]["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print("By category:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

    print(f"\n{'Category':<20} {'Name':<42} {'Lat':>9} {'Lng':>10}")
    print("=" * 85)
    for feat in geojson["features"]:
        p = feat["properties"]
        c = feat["geometry"]["coordinates"]
        print(f"  {p['category']:<18} {p['name'][:40]:<42} {c[1]:>9.5f} {c[0]:>10.5f}")


def main() -> None:
    services = load_services()
    print(f"Geocoding {len(services)} civic service locations...\n")
    geocode_all_services(services)

    geocoded = [s for s in services if "lat" in s]
    print(f"\nGeocoded: {len(geocoded)}/{len(services)}\n")

    geojson = build_geojson_from_services(services)
    output = Path(__file__).resolve().parent.parent / "data" / "civic_services.geojson"
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"Saved: {output}")
    print(f"Features: {len(geojson['features'])}\n")
    print_summary(geojson)


if __name__ == "__main__":
    main()
