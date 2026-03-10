"""Pure helper functions for the jobs scraper — skills, geocoding, and GeoJSON/DB row building."""

import re
import time
from datetime import datetime, timezone

from backend.core.data_scraping.geo import geocode_nominatim, geocode_arcgis_business
from backend.core.data_scraping.payloads import SKILL_CATEGORIES


def extract_skills(job: dict) -> None:
    """Scan job description for skill keywords and write results back onto the job dict."""
    desc = (
        job.get("description_text")
        or job.get("description")
        or job.get("job_summary")
        or ""
    )
    desc_clean = re.sub(r"<[^>]+>", " ", desc).lower()
    found: dict[str, list[str]] = {}
    for category, keywords in SKILL_CATEGORIES.items():
        matches = [kw for kw in keywords if kw in desc_clean]
        if matches:
            found[category] = matches
    job["skills"] = found
    all_skills: list[str] = []
    for cat_skills in found.values():
        all_skills.extend(cat_skills)
    job["skill_summary"] = ", ".join(all_skills)


def geocode_job(
    job: dict,
    arcgis_cache: dict[str, tuple | None],
    nominatim_cache: dict[str, tuple | None],
) -> None:
    """Resolve lat/lng for a job via ArcGIS business lookup then Nominatim fallback."""
    company = job.get("company_name", "")
    address = job.get("location") or job.get("job_location", "")

    if company and company not in arcgis_cache:
        arcgis_cache[company] = geocode_arcgis_business(company)
        time.sleep(0.3)

    arcgis_result = arcgis_cache.get(company)
    if arcgis_result:
        job["lat"], job["lng"] = arcgis_result[0], arcgis_result[1]
        job["geocode_source"] = "arcgis_business_license"
        job["geocode_address"] = arcgis_result[3]
    elif address:
        if address not in nominatim_cache:
            nominatim_cache[address] = geocode_nominatim(address)
            time.sleep(1)
        nom = nominatim_cache.get(address)
        if nom:
            job["lat"], job["lng"] = nom[0], nom[1]
            job["geocode_source"] = "nominatim"


def build_geojson_feature(job: dict) -> dict | None:
    """Convert a geocoded job dict to a GeoJSON Feature, or return None if not geocoded."""
    if "lat" not in job or "lng" not in job:
        return None
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [job["lng"], job["lat"]]},
        "properties": {
            "id": job.get("_id", ""),
            "title": job.get("job_title", ""),
            "company": job.get("company_name", ""),
            "source": job.get("_source", ""),
            "address": job.get("location") or job.get("job_location", ""),
            "geocode_source": job.get("geocode_source", ""),
            "geocode_address": job.get("geocode_address", ""),
            "job_type": job.get("job_type") or job.get("job_employment_type", ""),
            "salary": job.get("salary_formatted") or job.get("job_base_pay_range", ""),
            "seniority": job.get("job_seniority_level", ""),
            "industry": job.get("job_industries") or job.get("job_function", ""),
            "applicants": job.get("job_num_applicants"),
            "posted": job.get("date_posted_parsed") or job.get("job_posted_date", ""),
            "url": job.get("url", ""),
            "apply_link": job.get("apply_link", ""),
            "skills": job.get("skills", {}),
            "skill_summary": job.get("skill_summary", ""),
            "benefits": job.get("benefits", []),
            "company_rating": job.get("company_rating"),
            "scraped_at": job.get("_scraped_at", ""),
        },
    }


def feature_to_row(feature: dict) -> dict:
    """Convert a GeoJSON Feature to a flat DB row dict for bulk upsert."""
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
        "properties": {
            k: v for k, v in props.items()
            if k not in ("id", "title", "company", "source", "address", "url")
        },
    }
