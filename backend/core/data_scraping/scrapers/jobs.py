"""Jobs scraper — Indeed, LinkedIn, Glassdoor via Bright Data Web Scraper API."""

import json
import re
import time
from pathlib import Path

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.geo import geocode_nominatim, geocode_arcgis_business
from backend.core.data_scraping.payloads import JOB_SCRAPERS, SKILL_CATEGORIES
from backend.core.data_scraping.bright_data_client import trigger_and_collect


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
            self._extract_skills(job)
            self._geocode_job(job, arcgis_cache, nominatim_cache)

            feature = self._build_geojson_feature(job)
            if feature:
                features.append(feature)

        return features

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("job_title", ""),
            record.get("company_name", ""),
            record.get("url", ""),
        )

    # ------------------------------------------------------------------
    # Jobs-specific helpers
    # ------------------------------------------------------------------

    def _extract_skills(self, job: dict) -> None:
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

    def _geocode_job(
        self,
        job: dict,
        arcgis_cache: dict[str, tuple | None],
        nominatim_cache: dict[str, tuple | None],
    ) -> None:
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

    def _build_geojson_feature(self, job: dict) -> dict | None:
        if "lat" not in job:
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

    def save(self, records: list[dict]) -> None:
        """Override to also append to history JSONL."""
        super().save(records)
        history_file = OUTPUT_FILES["jobs_history"]
        history_file.parent.mkdir(parents=True, exist_ok=True)
        with open(history_file, "a", encoding="utf-8") as f:
            for feat in records:
                f.write(json.dumps(feat) + "\n")
