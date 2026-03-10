"""Benefits scraper — Government eligibility pages via Bright Data Web Unlocker."""

import re
import time
from datetime import datetime, timezone

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.bright_data_client import fetch_with_unlocker
from backend.core.data_scraping.payloads import BENEFITS_TARGETS


class BenefitsScraper(BaseScraper):
    name = "services"  # JSON collection key
    output_file = OUTPUT_FILES["benefits"]
    event_type = "benefits"
    output_format = "json"

    def fetch(self) -> list[dict]:
        """Fetch benefit pages as markdown via Web Unlocker."""
        results: list[dict] = []
        for i, target in enumerate(BENEFITS_TARGETS):
            markdown = fetch_with_unlocker(url=target["url"], as_markdown=True)
            if markdown:
                results.append({"markdown": markdown, "target": target})
            if i < len(BENEFITS_TARGETS) - 1:
                time.sleep(2)
        return results

    def process(self, raw_data: list[dict]) -> list[dict]:
        return [self._parse_benefit_markdown(item["markdown"], item["target"]) for item in raw_data]

    def generate_id(self, record: dict) -> str:
        return record.get("id", "")

    def _collection_key(self) -> str:
        return "services"

    async def save_to_database(self, records: list[dict]) -> int:
        """Persist benefit services to benefit_services table."""
        from backend.db.session import get_session
        from backend.db.crud.benefits import bulk_upsert_benefits

        rows = [self._service_to_row(s) for s in records]
        async with get_session() as session:
            return await bulk_upsert_benefits(session, rows)

    def _service_to_row(self, service: dict) -> dict:
        """Convert scraper service dict to DB column dict."""
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

    # ------------------------------------------------------------------
    # Benefits-specific parsing
    # ------------------------------------------------------------------

    def _parse_benefit_markdown(self, markdown: str, target: dict) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        income_limits = self._parse_income_table(markdown)
        eligibility = self._parse_requirements_list(markdown, "eligib")
        how_to_apply = self._parse_requirements_list(markdown, "apply")
        documents = self._parse_requirements_list(markdown, "document")

        if not eligibility:
            eligibility = self._parse_requirements_list(markdown, "qualif")
        if not how_to_apply:
            how_to_apply = self._parse_requirements_list(markdown, "how to")

        return {
            "id": target["id"],
            "category": target["category"],
            "title": target["name"],
            "provider": self._extract_provider(markdown) or target["name"],
            "description": self._extract_first_paragraph(markdown),
            "eligibility": eligibility,
            "income_limits": income_limits,
            "how_to_apply": how_to_apply,
            "documents_needed": documents,
            "url": target["url"],
            "phone": self._extract_phone(markdown),
            "scraped_at": now,
            "source": "live_scrape",
        }

    @staticmethod
    def _parse_income_table(markdown: str) -> dict[str, int]:
        limits: dict[str, int] = {}
        pattern = r"\|?\s*(?:Household\s+(?:of\s+)?)?(\d+)\s*\|?\s*\$?([\d,]+)"
        for match in re.finditer(pattern, markdown):
            limits[match.group(1)] = int(match.group(2).replace(",", ""))
        return limits

    @staticmethod
    def _parse_requirements_list(markdown: str, section_keyword: str) -> list[str]:
        lines = markdown.split("\n")
        collecting = False
        items: list[str] = []
        for line in lines:
            stripped = line.strip()
            if section_keyword.lower() in stripped.lower() and stripped.startswith("#"):
                collecting = True
                continue
            if collecting and stripped.startswith("#"):
                break
            if collecting and (stripped.startswith("- ") or stripped.startswith("* ")):
                text = stripped.lstrip("-* ").strip()
                if len(text) > 5:
                    items.append(text)
        return items[:15]

    @staticmethod
    def _extract_first_paragraph(markdown: str) -> str:
        for line in markdown.split("\n"):
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and not stripped.startswith("|") and len(stripped) > 30:
                return stripped[:300]
        return ""

    @staticmethod
    def _extract_phone(markdown: str) -> str:
        match = re.search(r"[\(]?\d{3}[\)\-\s]?\s*\d{3}[\-\s]\d{4}", markdown)
        return match.group(0) if match else ""

    @staticmethod
    def _extract_provider(markdown: str) -> str:
        for line in markdown.split("\n"):
            if line.strip().startswith("# "):
                return line.strip().lstrip("# ").strip()[:100]
        return ""

    @staticmethod
    def _merge_with_fallback(live: list[dict], fallback: list[dict]) -> list[dict]:
        live_ids = {s["id"] for s in live}
        kept = [s for s in fallback if s["id"] not in live_ids]
        return live + kept
