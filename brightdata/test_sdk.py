"""Quick test: trigger all Bright Data SDK functions and save results."""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Load .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

OUTPUT_DIR = Path(__file__).resolve().parent
ts = datetime.now().strftime("%Y%m%d_%H%M%S")


def save_result(name: str, data) -> None:
    path = OUTPUT_DIR / f"{name}_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    print(f"  Saved: {path} ({os.path.getsize(path)} bytes)")


def test_serp() -> None:
    print("\n=== SERP Search ===")
    from backend.core.bright_data_client import serp_search
    result = serp_search("Montgomery Alabama news today")
    if result:
        print(f"  Got {len(result.get('results', []))} results")
        save_result("serp", result)
    else:
        print("  FAILED - no results")


def test_page_fetch() -> None:
    print("\n=== Page Fetch (crawl dataset) ===")
    from backend.core.bright_data_client import fetch_with_unlocker
    content = fetch_with_unlocker("https://medicaid.alabama.gov")
    if content:
        print(f"  Got {len(content)} chars")
        save_result("crawl_medicaid", {"url": "https://medicaid.alabama.gov", "content": content[:5000]})
    else:
        print("  FAILED - no content")


def test_dataset_trigger() -> None:
    print("\n=== Dataset Trigger (Indeed jobs) ===")
    from backend.core.bright_data_client import trigger_and_collect
    from backend.core.payloads import JOB_SCRAPERS

    scraper = JOB_SCRAPERS[0]  # Indeed
    print(f"  Triggering: {scraper['name']} ({scraper['dataset_id']})")
    results = trigger_and_collect(
        dataset_id=scraper["dataset_id"],
        payload=scraper["payload"],
        params=scraper["params"],
    )
    if results:
        print(f"  Got {len(results)} records")
        save_result("jobs_indeed", results[:50])  # Save first 50
    else:
        print("  No results (may take time or quota issue)")


if __name__ == "__main__":
    print(f"Bright Data SDK Test — {datetime.now().isoformat()}")
    print(f"Output dir: {OUTPUT_DIR}")

    test_serp()
    test_page_fetch()
    test_dataset_trigger()

    print("\nDone!")
