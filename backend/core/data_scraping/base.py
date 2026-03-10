"""BaseScraper — Strategy pattern base class for all data scrapers.

Subclasses implement: fetch(), process(), generate_id().
Base class provides: run(), deduplicate(), load_existing(), save(), broadcast().
"""

import hashlib
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

from backend.core.sse_broadcaster import broadcast_event_threadsafe

logger = logging.getLogger("scraper")


class BaseScraper(ABC):
    """Abstract base for all data scrapers.

    Attributes:
        name: Human-readable scraper name (e.g. "jobs", "news").
        output_file: Path where processed data is saved.
        event_type: SSE event name for frontend broadcast.
        output_format: "geojson" or "json" — controls save/load format.
    """

    name: str
    output_file: Path
    event_type: str
    output_format: str  # "geojson" | "json"

    @abstractmethod
    def fetch(self) -> list[dict]:
        """Fetch raw data from external source. Returns list of raw records."""

    @abstractmethod
    def process(self, raw_data: list[dict]) -> list[dict]:
        """Transform raw records into processed output records."""

    @abstractmethod
    def generate_id(self, record: dict) -> str:
        """Generate a stable dedup ID for a single record."""

    # ------------------------------------------------------------------
    # Template method
    # ------------------------------------------------------------------

    def run(self) -> int:
        """Execute full pipeline: fetch -> process -> dedup -> save -> broadcast."""
        import asyncio

        logger.info("[%s] Starting scrape", self.name)

        raw_data = self.fetch()
        if not raw_data:
            logger.info("[%s] No data fetched", self.name)
            return 0

        processed = self.process(raw_data)
        if not processed:
            logger.info("[%s] No records after processing", self.name)
            return 0

        # Save to database (primary), fall back to JSON if not implemented
        try:
            asyncio.run(self.save_to_database(processed))
        except NotImplementedError:
            existing = self.load_existing()
            merged = self.deduplicate(processed, existing)
            self.save(merged)

        self.broadcast(processed)
        logger.info("[%s] Complete: %d records", self.name, len(processed))
        return len(processed)

    async def save_to_database(self, records: list[dict]) -> int:
        """Override in subclasses to persist records to the database."""
        raise NotImplementedError(f"{self.name} has not implemented save_to_database")

    # ------------------------------------------------------------------
    # Shared infrastructure
    # ------------------------------------------------------------------

    @staticmethod
    def make_id(*parts: str) -> str:
        """Generate a stable 12-char hex ID from key parts."""
        key = "__".join(parts)
        return hashlib.md5(key.encode()).hexdigest()[:12]

    def deduplicate(self, new_records: list[dict], existing_records: list[dict]) -> list[dict]:
        """Merge new into existing. New records replace old by ID."""
        new_ids = {self._get_record_id(r) for r in new_records}
        kept = [r for r in existing_records if self._get_record_id(r) not in new_ids]
        return new_records + kept

    def load_existing(self) -> list[dict]:
        """Load existing records from output file."""
        if not self.output_file.exists():
            return []
        try:
            with open(self.output_file, encoding="utf-8") as f:
                data = json.load(f)
            if self.output_format == "geojson":
                return data.get("features", [])
            return data.get(self._collection_key(), [])
        except (json.JSONDecodeError, KeyError):
            return []

    def save(self, records: list[dict]) -> None:
        """Save records to output file in the configured format."""
        self.output_file.parent.mkdir(parents=True, exist_ok=True)

        if self.output_format == "geojson":
            output = {"type": "FeatureCollection", "features": records}
        else:
            output = {
                "lastScraped": datetime.now(timezone.utc).isoformat(),
                f"total{self._collection_key().title()}": len(records),
                self._collection_key(): records,
            }

        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        logger.info("[%s] Saved %d records to %s", self.name, len(records), self.output_file)

    def broadcast(self, records: list[dict]) -> None:
        """Broadcast new records to connected SSE clients."""
        try:
            broadcast_event_threadsafe(self.event_type, records)
        except (RuntimeError, OSError, ValueError) as exc:
            logger.warning("[%s] SSE broadcast failed: %s", self.name, exc)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_record_id(self, record: dict) -> str:
        """Extract ID from a record, handling both flat and GeoJSON formats."""
        if self.output_format == "geojson":
            return record.get("properties", {}).get("id", "")
        return record.get("id", "")

    def _collection_key(self) -> str:
        """JSON key for the record collection (e.g. 'articles', 'services')."""
        return self.name
