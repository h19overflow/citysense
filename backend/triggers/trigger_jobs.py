"""Trigger Indeed + LinkedIn + Glassdoor scrapers via Bright Data Web Scraper API.

Usage:
    python -m scripts.triggers.trigger_jobs --poll
    python -m scripts.triggers.trigger_jobs --webhook http://localhost:8787/webhook/jobs
"""

import argparse
import json
from datetime import datetime, timezone

from backend.config import RAW_DIR
from backend.core.payloads import JOB_SCRAPERS
from backend.core.bright_data_client import trigger_scraper, poll_snapshot
from backend.processors.process_jobs import (
    detect_source, process_jobs, build_geojson_feature, save_job_results,
)


def run_trigger(webhook_url: str | None = None, use_poll: bool = False) -> None:
    """Trigger all job scrapers and optionally poll for results."""
    print(f"{'=' * 60}")
    print(f"TRIGGERING JOB SCRAPERS — {datetime.now().isoformat()}")
    print(f"Mode: {'poll' if use_poll else 'webhook' if webhook_url else 'fire-and-forget'}")
    print(f"{'=' * 60}")

    all_features: list[dict] = []

    for scraper in JOB_SCRAPERS:
        print(f"\n[{scraper['name']}]")
        snapshot_id = trigger_scraper(
            dataset_id=scraper["dataset_id"],
            payload=scraper["payload"],
            params=scraper["params"],
            webhook_url=webhook_url,
        )

        if snapshot_id and use_poll:
            raw_jobs = poll_snapshot(snapshot_id)
            if raw_jobs:
                save_raw_batch(scraper["name"], raw_jobs)
                valid = [r for r in raw_jobs if r.get("job_title") and not r.get("error")]
                processed = process_jobs(valid, scraper["name"])
                for job in processed:
                    feat = build_geojson_feature(job)
                    if feat:
                        all_features.append(feat)

    if use_poll and all_features:
        save_job_results(all_features)

    if webhook_url:
        print("\nScrapers triggered. Results will arrive via webhook.")


def save_raw_batch(source_name: str, raw_jobs: list[dict]) -> None:
    """Save raw scraper output for debugging."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = RAW_DIR / f"{source_name.lower()}_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(raw_jobs, f, indent=2)
    print(f"  Raw saved: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger Bright Data job scrapers")
    parser.add_argument("--webhook", type=str, help="Webhook URL for delivery")
    parser.add_argument("--poll", action="store_true", help="Poll for results")
    args = parser.parse_args()

    run_trigger(webhook_url=args.webhook, use_poll=args.poll)


if __name__ == "__main__":
    main()
