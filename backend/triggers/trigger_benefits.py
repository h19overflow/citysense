"""Scrape government benefit eligibility pages via Bright Data Web Unlocker.

Fetches Alabama Medicaid, SNAP, and TANF pages as markdown,
then parses them into structured eligibility data.

Usage:
    python -m scripts.triggers.trigger_benefits --poll
"""

import argparse
import time
from datetime import datetime

from backend.core.payloads import BENEFITS_TARGETS
from backend.core.bright_data_client import fetch_with_unlocker
from backend.processors.process_benefits import (
    parse_benefit_markdown, load_fallback_services,
    merge_with_fallback, save_benefits,
)


def scrape_benefit_pages() -> list[dict]:
    """Fetch and parse all benefit target pages."""
    live_services: list[dict] = []

    for i, target in enumerate(BENEFITS_TARGETS):
        print(f"\n[{i+1}/{len(BENEFITS_TARGETS)}] Fetching: {target['name']}")
        print(f"  URL: {target['url']}")

        markdown = fetch_with_unlocker(url=target["url"], as_markdown=True)

        if markdown:
            print(f"  Got {len(markdown)} chars of markdown")
            service = parse_benefit_markdown(markdown, target)
            eligibility_count = len(service.get("eligibility", []))
            income_count = len(service.get("income_limits", {}))
            print(f"  Parsed: {eligibility_count} eligibility rules, {income_count} income limits")
            live_services.append(service)
        else:
            print("  FAILED — will use fallback data")

        if i < len(BENEFITS_TARGETS) - 1:
            time.sleep(2)

    return live_services


def run_benefits_pipeline() -> None:
    """Run the benefits scraping pipeline with fallback."""
    print(f"{'=' * 60}")
    print(f"BENEFITS SCRAPER — {datetime.now().isoformat()}")
    print(f"{'=' * 60}")

    live_services = scrape_benefit_pages()
    fallback_services = load_fallback_services()

    merged = merge_with_fallback(live_services, fallback_services)
    print(f"\nLive: {len(live_services)}, Fallback: {len(fallback_services)}, Merged: {len(merged)}")

    save_benefits(merged)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape government benefit eligibility")
    parser.add_argument("--poll", action="store_true", help="Run synchronously")
    args = parser.parse_args()

    run_benefits_pipeline()


if __name__ == "__main__":
    main()
