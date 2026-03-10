"""GeoJSON output and persistence for processed job data."""

import json
from pathlib import Path

from backend.config import OUTPUT_FILES, RAW_DIR


def build_geojson_feature(job: dict) -> dict | None:
    """Convert a processed job dict to a GeoJSON Feature."""
    if "lat" not in job:
        return None

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [job["lng"], job["lat"]],
        },
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


def save_job_results(features: list[dict]) -> None:
    """Save GeoJSON + append to history. Deduplicates by job ID."""
    jobs_file = OUTPUT_FILES["jobs"]
    history_file = OUTPUT_FILES["jobs_history"]
    jobs_file.parent.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    existing_ids: set[str] = set()
    existing_features: list[dict] = []
    if jobs_file.exists():
        with open(jobs_file) as f:
            existing = json.load(f)
            existing_features = existing.get("features", [])
            existing_ids = {f["properties"]["id"] for f in existing_features}

    new_ids = {f["properties"]["id"] for f in features}
    kept = [f for f in existing_features if f["properties"]["id"] not in new_ids]
    merged = kept + features

    geojson = {"type": "FeatureCollection", "features": merged}
    with open(jobs_file, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    with open(history_file, "a", encoding="utf-8") as f:
        for feat in features:
            f.write(json.dumps(feat) + "\n")

    added = len(new_ids - existing_ids)
    updated = len(new_ids & existing_ids)
    print(f"\nSaved: {jobs_file}")
    print(f"  Total features: {len(merged)}")
    print(f"  New: {added}, Updated: {updated}, Existing kept: {len(kept)}")
