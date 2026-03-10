"""Trigger Zillow property listing scraper via Bright Data Web Scraper API.

Usage:
    python -m scripts.triggers.trigger_housing --poll
    python -m scripts.triggers.trigger_housing --webhook http://localhost:8787/webhook/housing
"""

import argparse
from datetime import datetime

from backend.config import DATASETS
from backend.core.bright_data_client import trigger_scraper, poll_snapshot
from backend.processors.process_housing import (
    process_zillow_listings, save_housing_results,
)


def run_trigger(webhook_url: str | None = None, use_poll: bool = False) -> None:
    """Trigger Zillow scraper for Montgomery listings."""
    print(f"{'=' * 60}")
    print(f"HOUSING SCRAPER — {datetime.now().isoformat()}")
    print(f"{'=' * 60}")

    payload = [{
        "url": "https://www.zillow.com/montgomery-al/rentals/",
    }]
    params = {
        "type": "discover_new",
        "discover_by": "url",
        "limit_per_input": "100",
    }

    print("\n[Zillow — Montgomery, AL Rentals]")
    snapshot_id = trigger_scraper(
        dataset_id=DATASETS["zillow"],
        payload=payload,
        params=params,
        webhook_url=webhook_url,
    )

    if snapshot_id and use_poll:
        raw_listings = poll_snapshot(snapshot_id)
        if raw_listings:
            print(f"\nProcessing {len(raw_listings)} listings...")
            features = process_zillow_listings(raw_listings)
            save_housing_results(features)

    if webhook_url:
        print("\nTriggered. Results will arrive via webhook.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger Zillow housing scraper")
    parser.add_argument("--webhook", type=str, help="Webhook URL for delivery")
    parser.add_argument("--poll", action="store_true", help="Poll for results")
    args = parser.parse_args()

    run_trigger(webhook_url=args.webhook, use_poll=args.poll)


if __name__ == "__main__":
    main()
