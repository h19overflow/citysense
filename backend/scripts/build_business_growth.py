"""
Build business growth data from Montgomery ArcGIS Construction Permits.

Queries the Construction_Permits layer, aggregates by month and type,
then outputs public/data/business_growth.json.

Usage:
  python scripts/build_business_growth.py
  python scripts/build_business_growth.py --dry-run
"""

import argparse
import json
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests

BASE = "https://gis.montgomeryal.gov/server/rest/services"
PERMITS_URL = f"{BASE}/HostedDatasets/Construction_Permits/FeatureServer/0"
LICENSES_URL = f"{BASE}/HostedDatasets/Business_Licenses/FeatureServer/0"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"
OUTPUT_FILE = OUTPUT_DIR / "business_growth.json"


def query_feature_count(endpoint_url: str, where_clause: str) -> int:
    """Return feature count for a WHERE clause, or 0 on failure."""
    params = {"where": where_clause, "returnCountOnly": "true", "f": "json"}
    try:
        resp = requests.get(f"{endpoint_url}/query?{urlencode(params)}", timeout=30)
        return resp.json().get("count", 0)
    except (requests.RequestException, ValueError):
        return 0
    finally:
        time.sleep(0.3)


def query_features(endpoint_url: str, where_clause: str,
                   out_fields: str = "*", max_records: int = 2000) -> list[dict]:
    """Return list of feature attribute dicts, or [] on failure."""
    params = {
        "where": where_clause, "outFields": out_fields,
        "returnGeometry": "false", "resultRecordCount": str(max_records), "f": "json",
    }
    try:
        resp = requests.get(f"{endpoint_url}/query?{urlencode(params)}", timeout=30)
        return [f["attributes"] for f in resp.json().get("features", [])]
    except (requests.RequestException, ValueError, KeyError):
        return []
    finally:
        time.sleep(0.3)


def probe_layer_exists(endpoint_url: str) -> bool:
    """Check if an ArcGIS layer endpoint is reachable and valid."""
    try:
        resp = requests.get(f"{endpoint_url}?f=json", timeout=15)
        return resp.ok and "error" not in resp.json()
    except (requests.RequestException, ValueError):
        return False


def build_year_month_where(months_back: int) -> str:
    """Build WHERE clause using Year/Month fields for the last N months."""
    now = datetime.now(tz=timezone.utc)
    clauses: list[str] = []
    for i in range(months_back):
        target = now - timedelta(days=i * 30)
        clauses.append(f"(Year = '{target.year}' AND Month = '{target.month}')")
    return " OR ".join(clauses)


def aggregate_permits_by_month(permits: list[dict]) -> list[dict]:
    """Group permits by YYYY-MM using Year/Month fields, return last 6 sorted."""
    monthly: Counter[str] = Counter()
    for permit in permits:
        year = permit.get("Year")
        month = permit.get("Month")
        if year and month:
            monthly[f"{year}-{str(month).zfill(2)}"] += 1
    last_six = sorted(monthly.keys())[-6:]
    return [{"month": m, "count": monthly[m]} for m in last_six]


def aggregate_permits_by_type(permits: list[dict]) -> list[dict]:
    """Count permits per UseType, return top 6 descending by count."""
    type_counts: Counter[str] = Counter()
    for permit in permits:
        type_counts[permit.get("UseType") or "Unknown"] += 1
    return [{"type": name, "count": n} for name, n in type_counts.most_common(6)]


def build_growth_data() -> dict:
    """Aggregate permit and license data into a business growth summary."""
    now = datetime.now(tz=timezone.utc)
    where_6m = build_year_month_where(6)
    permits = query_features(PERMITS_URL, where_6m, "IssuedDate,ProjectType,UseType,Year,Month")

    by_month = aggregate_permits_by_month(permits)
    by_type = aggregate_permits_by_type(permits)

    cur_month_where = f"Year = '{now.year}' AND Month = '{now.month}'"
    new_permits_30d = query_feature_count(PERMITS_URL, cur_month_where)

    total = max(len(permits), 1)
    commercial_count = sum(1 for p in permits if p.get("UseType") == "Commercial")
    commercial_percent = round(commercial_count / total * 100, 1)

    new_businesses_90d = 0
    if probe_layer_exists(LICENSES_URL):
        where_3m = build_year_month_where(3)
        new_businesses_90d = query_feature_count(LICENSES_URL, where_3m)

    return {
        "generatedAt": now.isoformat(),
        "newPermits30d": new_permits_30d,
        "commercialPercent": commercial_percent,
        "newBusinesses90d": new_businesses_90d,
        "topPermitType": by_type[0]["type"] if by_type else "N/A",
        "permitsByMonth": by_month,
        "permitsByType": by_type,
    }


def main() -> None:
    """Parse args, build data, and write or print output."""
    parser = argparse.ArgumentParser(description="Build business growth data")
    parser.add_argument("--dry-run", action="store_true", help="Print JSON instead of writing")
    args = parser.parse_args()

    print("Building business growth data from Montgomery ArcGIS...")
    data = build_growth_data()

    if args.dry_run:
        print(json.dumps(data, indent=2))
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(data, indent=2))
    print(f"Wrote {OUTPUT_FILE}")
    print(f"  Permits (30d): {data['newPermits30d']}")
    print(f"  Commercial %:  {data['commercialPercent']}")
    print(f"  Businesses (90d): {data['newBusinesses90d']}")
    print(f"  Top type: {data['topPermitType']}")


if __name__ == "__main__":
    main()
