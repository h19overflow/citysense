"""Jobs scraper — Indeed, LinkedIn, Glassdoor via Bright Data Web Scraper API."""

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.payloads import JOB_SCRAPERS
from backend.core.data_scraping.bright_data_client import trigger_and_collect
from backend.core.data_scraping.scrapers.jobs_helpers import (
    extract_skills,
    geocode_job,
    build_geojson_feature,
    feature_to_row,
)


class JobsScraper(BaseScraper):
    name = "jobs"
    output_file = OUTPUT_FILES["jobs"]
    event_type = "jobs"
    output_format = "geojson"

    def fetch(self) -> list[dict]:
        all_jobs: list[dict] = []
        for scraper in JOB_SCRAPERS:
            raw = trigger_and_collect(
                dataset_id=scraper["dataset_id"],
                payload=scraper["payload"],
                params=scraper["params"],
            )
            valid = [r for r in raw if r.get("job_title") and not r.get("error")]
            for job in valid:
                job["_source"] = scraper["name"].lower()
            all_jobs.extend(valid)
        return all_jobs

    def process(self, raw_data: list[dict]) -> list[dict]:
        arcgis_cache: dict[str, tuple | None] = {}
        nominatim_cache: dict[str, tuple | None] = {}
        features: list[dict] = []
        for job in raw_data:
            job["_id"] = self.generate_id(job)
            extract_skills(job)
            geocode_job(job, arcgis_cache, nominatim_cache)
            feature = build_geojson_feature(job)
            if feature:
                features.append(feature)
        return features

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("job_title", ""),
            record.get("company_name", ""),
            record.get("url", ""),
        )

    async def save_to_database(self, records: list[dict]) -> int:
        """Persist GeoJSON features to job_listings table."""
        from backend.db.session import get_session
        from backend.db.crud.jobs import bulk_upsert_jobs

        rows = [feature_to_row(f) for f in records if f.get("properties")]
        async with get_session() as session:
            return await bulk_upsert_jobs(session, rows)
