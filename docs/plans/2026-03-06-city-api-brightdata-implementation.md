# City API + Bright Data Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 demo-ready features that fuse Montgomery ArcGIS city data with Bright Data scraping: Job Map with city overlays, Benefits Eligibility Engine, and Neighborhood Intelligence heatmap.

**Architecture:** Python scripts pre-scrape data into `public/data/` JSON files. Frontend reads static files. Live scrape during demo for dramatic effect. No backend server — all client-side rendering from static data.

**Tech Stack:** Python (requests, geojson), React, TypeScript, Leaflet, Tailwind CSS

---

### Task 1: Build neighborhood scores script

**Files:**
- Create: `scripts/build_neighborhood_scores.py`

**What this does:** Hit 5 ArcGIS endpoints, aggregate counts per zip code, compute a 0-100 composite neighborhood health score, output as GeoJSON.

**Step 1: Create the script**

```python
"""
Build neighborhood health scores from Montgomery ArcGIS data.

Hits 5 endpoints:
  - 311 Service Requests (207K records) — negative signal
  - Code Violations (79K records) — negative signal
  - Construction Permits (43K records) — positive signal
  - Flood Hazard Areas — negative signal
  - Paving Projects (960 records) — positive signal

Aggregates by zip code, normalizes, weights, outputs GeoJSON.
"""

import json
import math
import time
from pathlib import Path
from urllib.parse import urlencode

import requests

BASE = "https://gis.montgomeryal.gov/server/rest/services"

ENDPOINTS = {
    "311": f"{BASE}/HostedDatasets/Received_311_Service_Request/FeatureServer/0",
    "violations": f"{BASE}/HostedDatasets/Code_Violations/FeatureServer/0",
    "permits": f"{BASE}/HostedDatasets/Construction_Permits/FeatureServer/0",
    "paving": f"{BASE}/HostedDatasets/Paving_Project/FeatureServer/0",
}

ZIP_ENDPOINT = f"{BASE}/Zip_Code/FeatureServer/0"
FLOOD_ENDPOINT = f"{BASE}/OneView/Flood_Hazard_Areas/FeatureServer/0"

# Weights for scoring (must sum to 1.0)
WEIGHTS = {
    "311": -0.30,       # negative: more complaints = worse
    "violations": -0.25, # negative: more violations = worse
    "permits": 0.20,     # positive: investment
    "paving": 0.10,      # positive: city investment
    "flood": -0.15,      # negative: risk
}

OUTPUT = Path(__file__).parent.parent / "montgomery-navigator" / "public" / "data" / "neighborhood_scores.geojson"


def fetch_all_features(url: str, where: str = "1=1", out_fields: str = "*") -> list[dict]:
    """Paginate through an ArcGIS FeatureServer, returning all features."""
    features = []
    offset = 0
    batch = 2000

    while True:
        params = {
            "where": where,
            "outFields": out_fields,
            "outSR": "4326",
            "f": "geojson",
            "resultRecordCount": batch,
            "resultOffset": offset,
        }
        resp = requests.get(f"{url}/query?{urlencode(params)}", timeout=60)
        resp.raise_for_status()
        data = resp.json()
        batch_features = data.get("features", [])

        if not batch_features:
            break

        features.extend(batch_features)
        offset += len(batch_features)
        print(f"  fetched {len(features)} features so far...")

        if len(batch_features) < batch:
            break

        time.sleep(0.3)

    return features


def fetch_zip_polygons() -> dict:
    """Fetch zip code polygon geometries."""
    print("Fetching zip code polygons...")
    features = fetch_all_features(ZIP_ENDPOINT, out_fields="NAME")
    return {f["properties"]["NAME"]: f for f in features if f["properties"].get("NAME")}


def count_by_zip(features: list[dict], zip_polygons: dict) -> dict[str, int]:
    """Count features per zip code using simple point-in-bbox check.

    For a proper implementation we'd do point-in-polygon, but bbox
    is sufficient for demo scoring since zip codes don't overlap much.
    """
    from collections import defaultdict

    counts: dict[str, int] = defaultdict(int)

    # Build bbox lookup for each zip
    zip_bboxes = {}
    for zip_code, poly_feature in zip_polygons.items():
        geom = poly_feature.get("geometry", {})
        coords = geom.get("coordinates", [])
        if not coords:
            continue

        # Flatten all coordinate rings to find bbox
        all_points = []
        for ring_group in coords:
            if isinstance(ring_group[0][0], (int, float)):
                all_points.extend(ring_group)
            else:
                for ring in ring_group:
                    all_points.extend(ring)

        if not all_points:
            continue

        lngs = [p[0] for p in all_points]
        lats = [p[1] for p in all_points]
        zip_bboxes[zip_code] = {
            "min_lng": min(lngs), "max_lng": max(lngs),
            "min_lat": min(lats), "max_lat": max(lats),
        }

    # Assign each point feature to a zip
    for feat in features:
        geom = feat.get("geometry")
        if not geom or geom.get("type") != "Point":
            continue
        lng, lat = geom["coordinates"][0], geom["coordinates"][1]

        for zip_code, bbox in zip_bboxes.items():
            if (bbox["min_lng"] <= lng <= bbox["max_lng"] and
                    bbox["min_lat"] <= lat <= bbox["max_lat"]):
                counts[zip_code] += 1
                break

    return dict(counts)


def compute_flood_coverage(zip_polygons: dict) -> dict[str, float]:
    """Estimate flood zone overlap per zip (0.0 - 1.0).

    Simple heuristic: count flood features whose bbox overlaps each zip bbox.
    """
    print("Fetching flood hazard areas...")
    flood_features = fetch_all_features(
        FLOOD_ENDPOINT,
        where="SFHA_TF='T'",
        out_fields="FLD_ZONE",
    )

    # For simplicity, just count flood polygons that overlap each zip bbox
    from collections import defaultdict
    overlap_counts: dict[str, int] = defaultdict(int)

    zip_bboxes = {}
    for zip_code, poly_feature in zip_polygons.items():
        geom = poly_feature.get("geometry", {})
        coords = geom.get("coordinates", [])
        if not coords:
            continue
        all_points = []
        for ring_group in coords:
            if isinstance(ring_group[0][0], (int, float)):
                all_points.extend(ring_group)
            else:
                for ring in ring_group:
                    all_points.extend(ring)
        if not all_points:
            continue
        lngs = [p[0] for p in all_points]
        lats = [p[1] for p in all_points]
        zip_bboxes[zip_code] = (min(lngs), max(lngs), min(lats), max(lats))

    for flood_feat in flood_features:
        fgeom = flood_feat.get("geometry", {})
        fcoords = fgeom.get("coordinates", [])
        if not fcoords:
            continue
        fall = []
        for ring_group in fcoords:
            if isinstance(ring_group[0][0], (int, float)):
                fall.extend(ring_group)
            else:
                for ring in ring_group:
                    fall.extend(ring)
        if not fall:
            continue
        flngs = [p[0] for p in fall]
        flats = [p[1] for p in fall]
        fbbox = (min(flngs), max(flngs), min(flats), max(flats))

        for zip_code, zbbox in zip_bboxes.items():
            if (fbbox[0] <= zbbox[1] and fbbox[1] >= zbbox[0] and
                    fbbox[2] <= zbbox[3] and fbbox[3] >= zbbox[2]):
                overlap_counts[zip_code] += 1

    max_count = max(overlap_counts.values()) if overlap_counts else 1
    return {z: c / max_count for z, c in overlap_counts.items()}


def normalize_counts(counts: dict[str, int]) -> dict[str, float]:
    """Normalize counts to 0.0-1.0 range."""
    if not counts:
        return {}
    max_val = max(counts.values())
    if max_val == 0:
        return {z: 0.0 for z in counts}
    return {z: c / max_val for z, c in counts.items()}


def compute_scores(
    zip_polygons: dict,
    normalized: dict[str, dict[str, float]],
    flood_coverage: dict[str, float],
) -> dict[str, dict]:
    """Compute composite score per zip code."""
    scores = {}

    for zip_code in zip_polygons:
        raw = 50.0  # Start at neutral

        # Apply weighted signals
        for signal, weight in WEIGHTS.items():
            if signal == "flood":
                value = flood_coverage.get(zip_code, 0.0)
            else:
                value = normalized.get(signal, {}).get(zip_code, 0.0)

            # Positive weights: higher value = higher score
            # Negative weights: higher value = lower score
            raw += weight * value * 50

        score = max(0, min(100, round(raw)))

        level = "green" if score >= 70 else "yellow" if score >= 40 else "red"

        scores[zip_code] = {
            "score": score,
            "level": level,
            "details": {
                "311_requests": normalized.get("311", {}).get(zip_code, 0),
                "code_violations": normalized.get("violations", {}).get(zip_code, 0),
                "construction_permits": normalized.get("permits", {}).get(zip_code, 0),
                "paving_projects": normalized.get("paving", {}).get(zip_code, 0),
                "flood_risk": flood_coverage.get(zip_code, 0),
            },
        }

    return scores


def build_geojson(zip_polygons: dict, scores: dict) -> dict:
    """Build final GeoJSON FeatureCollection."""
    features = []

    for zip_code, poly_feature in zip_polygons.items():
        score_data = scores.get(zip_code, {"score": 50, "level": "yellow", "details": {}})

        feature = {
            "type": "Feature",
            "geometry": poly_feature["geometry"],
            "properties": {
                "zip": zip_code,
                "score": score_data["score"],
                "level": score_data["level"],
                **score_data["details"],
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "generated_at": __import__("datetime").datetime.now().isoformat(),
            "signals": list(WEIGHTS.keys()),
            "weights": WEIGHTS,
        },
    }


def main():
    print("=== Building Neighborhood Scores ===\n")

    zip_polygons = fetch_zip_polygons()
    print(f"Found {len(zip_polygons)} zip codes\n")

    # Fetch point datasets
    raw_counts: dict[str, dict[str, int]] = {}
    for name, url in ENDPOINTS.items():
        print(f"Fetching {name}...")
        features = fetch_all_features(url, out_fields="OBJECTID")
        raw_counts[name] = count_by_zip(features, zip_polygons)
        print(f"  {name}: {sum(raw_counts[name].values())} total across {len(raw_counts[name])} zips\n")

    # Normalize each signal
    normalized = {name: normalize_counts(counts) for name, counts in raw_counts.items()}

    # Flood coverage
    flood_coverage = compute_flood_coverage(zip_polygons)

    # Compute scores
    scores = compute_scores(zip_polygons, normalized, flood_coverage)

    # Build and save GeoJSON
    geojson = build_geojson(zip_polygons, scores)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(geojson, f, indent=2)

    print(f"\nSaved {len(geojson['features'])} zip scores to {OUTPUT}")

    # Summary
    levels = {"green": 0, "yellow": 0, "red": 0}
    for s in scores.values():
        levels[s["level"]] += 1
    print(f"Scores: {levels['green']} green, {levels['yellow']} yellow, {levels['red']} red")


if __name__ == "__main__":
    main()
```

**Step 2: Run it**

Run: `cd scripts && python build_neighborhood_scores.py`
Expected: Fetches ~300K+ records across 5 endpoints (takes 2-5 min), outputs `public/data/neighborhood_scores.geojson` with scored zip code polygons.

**Step 3: Verify output**

Run: `python -c "import json; d=json.load(open('../montgomery-navigator/public/data/neighborhood_scores.geojson')); print(f'{len(d[\"features\"])} zips'); print(json.dumps(d['features'][0]['properties'], indent=2))"`
Expected: ~15-20 zip codes with score, level, and detail breakdown.

**Step 4: Commit**

```bash
git add scripts/build_neighborhood_scores.py montgomery-navigator/public/data/neighborhood_scores.geojson
git commit -m "feat(data): add neighborhood health score builder from ArcGIS data"
```

---

### Task 2: Build benefits rules JSON from civic guide

**Files:**
- Create: `montgomery-navigator/public/data/benefits_rules.json`

**What this does:** Structure the eligibility data from `docs/civic-guide-reference.md` into machine-readable JSON the frontend can consume.

**Step 1: Create the JSON file**

Read `docs/civic-guide-reference.md` thoroughly, then create:

```json
{
  "generated_at": "2026-03-06T00:00:00Z",
  "source": "docs/civic-guide-reference.md + Alabama state agency websites",
  "programs": [
    {
      "id": "medicaid",
      "name": "Alabama Medicaid",
      "category": "healthcare",
      "summary": "Free or low-cost health coverage for low-income Alabama residents.",
      "eligibility": {
        "income_limits_monthly": { "1": 1677, "2": 2268, "3": 2859, "4": 3450, "5": 4042, "6": 4633 },
        "income_basis": "monthly_gross",
        "fpl_percent": 138,
        "residency": "alabama",
        "citizenship_required": true,
        "age_groups": ["children", "pregnant", "parents", "disabled", "elderly"],
        "notes": "Children up to 19 qualify at higher income thresholds. Pregnant women qualify through 60 days postpartum."
      },
      "how_to_apply": {
        "online": "https://myalhipp.com",
        "phone": "1-800-362-1504",
        "in_person": "Montgomery County DHR, 3030 Mobile Highway, Montgomery, AL 36108",
        "hours": "Mon-Fri 8:00 AM - 5:00 PM"
      },
      "documents_needed": ["Photo ID", "Proof of income (pay stubs, tax return)", "Proof of Alabama residency", "Social Security numbers for all household members", "Proof of citizenship or immigration status"],
      "processing_time": "30-45 days",
      "icon": "heart-pulse"
    },
    {
      "id": "snap",
      "name": "SNAP (Food Stamps)",
      "category": "food",
      "summary": "Monthly EBT benefits for purchasing groceries.",
      "eligibility": {
        "income_limits_monthly": { "1": 1580, "2": 2137, "3": 2694, "4": 3250, "5": 3807, "6": 4364 },
        "income_basis": "monthly_gross",
        "fpl_percent": 130,
        "residency": "alabama",
        "citizenship_required": true,
        "work_requirement": "Able-bodied adults 18-54 without dependents must work 80+ hours/month",
        "notes": "Households with elderly/disabled members have higher income limits."
      },
      "how_to_apply": {
        "online": "https://mydhr.alabama.gov",
        "phone": "334-242-1310",
        "in_person": "Montgomery County DHR, 3030 Mobile Highway",
        "hours": "Mon-Fri 8:00 AM - 5:00 PM"
      },
      "documents_needed": ["Photo ID", "Proof of income", "Proof of residency", "Social Security numbers", "Bank statements"],
      "processing_time": "30 days (7 days expedited if very low income)",
      "icon": "shopping-cart"
    },
    {
      "id": "tanf",
      "name": "TANF (Cash Assistance)",
      "category": "cash",
      "summary": "Temporary cash aid for families with children.",
      "eligibility": {
        "income_limits_monthly": { "1": 0, "2": 0, "3": 863, "4": 1063, "5": 1223, "6": 1383 },
        "income_basis": "monthly_gross",
        "residency": "alabama",
        "citizenship_required": true,
        "requires_children": true,
        "lifetime_limit": "60 months",
        "work_requirement": "Must participate in work activities within 2 years of receiving benefits",
        "notes": "Only available to families with dependent children under 18. Very low income limits."
      },
      "how_to_apply": {
        "online": "https://mydhr.alabama.gov",
        "phone": "334-242-1310",
        "in_person": "Montgomery County DHR, 3030 Mobile Highway"
      },
      "documents_needed": ["Photo ID", "Birth certificates for children", "Proof of income", "Proof of residency"],
      "processing_time": "30 days",
      "icon": "banknote"
    },
    {
      "id": "childcare_subsidy",
      "name": "Child Care Subsidy",
      "category": "childcare",
      "summary": "Help paying for childcare so parents can work or attend training.",
      "eligibility": {
        "income_limits_monthly": { "1": 0, "2": 2268, "3": 2859, "4": 3450, "5": 4042, "6": 4633 },
        "income_basis": "monthly_gross",
        "fpl_percent": 85,
        "residency": "alabama",
        "citizenship_required": true,
        "requires_children": true,
        "requires_employment_or_training": true,
        "child_age_max": 12,
        "notes": "Copay ranges from $5-$20/week depending on income. Must be employed, in training, or in school."
      },
      "how_to_apply": {
        "online": "https://mydhr.alabama.gov",
        "phone": "334-242-1310",
        "in_person": "Montgomery County DHR, 3030 Mobile Highway"
      },
      "documents_needed": ["Photo ID", "Proof of employment or school enrollment", "Proof of income", "Child's birth certificate"],
      "processing_time": "30 days",
      "icon": "baby"
    },
    {
      "id": "liheap",
      "name": "LIHEAP (Utility Assistance)",
      "category": "utilities",
      "summary": "Help paying heating and cooling bills for low-income households.",
      "eligibility": {
        "income_limits_monthly": { "1": 1580, "2": 2137, "3": 2694, "4": 3250, "5": 3807, "6": 4364 },
        "income_basis": "monthly_gross",
        "fpl_percent": 150,
        "residency": "alabama",
        "citizenship_required": true,
        "seasonal": true,
        "notes": "Heating assistance available Oct-March. Cooling assistance available May-September. Priority given to elderly and disabled."
      },
      "how_to_apply": {
        "phone": "334-262-4106",
        "in_person": "Central Alabama Community Action Agency (CAACA), 920 S Court St, Montgomery"
      },
      "documents_needed": ["Photo ID", "Social Security card", "Proof of income", "Most recent utility bill", "Proof of residency"],
      "processing_time": "2-4 weeks during open enrollment",
      "icon": "zap"
    },
    {
      "id": "wic",
      "name": "WIC (Women, Infants & Children)",
      "category": "food",
      "summary": "Nutrition program for pregnant women, new mothers, and children under 5.",
      "eligibility": {
        "income_limits_monthly": { "1": 1927, "2": 2607, "3": 3289, "4": 3969, "5": 4649, "6": 5330 },
        "income_basis": "monthly_gross",
        "fpl_percent": 185,
        "residency": "alabama",
        "citizenship_required": false,
        "requires_children_or_pregnant": true,
        "child_age_max": 5,
        "notes": "Automatic eligibility if already receiving Medicaid, SNAP, or TANF. Open to non-citizens."
      },
      "how_to_apply": {
        "phone": "334-206-5673",
        "in_person": "Montgomery County Health Department, 3060 Mobile Highway"
      },
      "documents_needed": ["Photo ID", "Proof of income or Medicaid/SNAP card", "Proof of residency", "Immunization records for children"],
      "processing_time": "Same-day at walk-in clinics",
      "icon": "apple"
    }
  ]
}
```

**Step 2: Verify JSON is valid**

Run: `cd montgomery-navigator && node -e "const d = require('./public/data/benefits_rules.json'); console.log(d.programs.length + ' programs loaded')"`
Expected: `6 programs loaded`

**Step 3: Commit**

```bash
git add montgomery-navigator/public/data/benefits_rules.json
git commit -m "feat(data): add structured benefits eligibility rules from civic guide"
```

---

### Task 3: Create benefits eligibility engine

**Files:**
- Create: `montgomery-navigator/src/lib/benefitsEngine.ts`

**What this does:** Pure function that takes a citizen persona and benefits rules, returns which programs they qualify for with reasoning.

**Step 1: Create the engine**

```typescript
import type { CitizenMeta } from "./types";

export interface BenefitsProgram {
  id: string;
  name: string;
  category: string;
  summary: string;
  eligibility: {
    income_limits_monthly: Record<string, number>;
    income_basis: string;
    fpl_percent?: number;
    residency: string;
    citizenship_required: boolean;
    requires_children?: boolean;
    requires_children_or_pregnant?: boolean;
    requires_employment_or_training?: boolean;
    work_requirement?: string;
    child_age_max?: number;
    lifetime_limit?: string;
    seasonal?: boolean;
    notes?: string;
  };
  how_to_apply: {
    online?: string;
    phone?: string;
    in_person?: string;
    hours?: string;
  };
  documents_needed: string[];
  processing_time: string;
  icon: string;
}

export interface BenefitsRulesData {
  programs: BenefitsProgram[];
}

export type EligibilityStatus = "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";

export interface EligibilityResult {
  program: BenefitsProgram;
  status: EligibilityStatus;
  reasons: string[];
}

function getMonthlyIncome(civicData: CitizenMeta["civicData"]): number {
  const raw = civicData.income ?? 0;
  // If income looks annual (> $10K), convert to monthly
  return raw > 10000 ? Math.round(raw / 12) : raw;
}

function getHouseholdSize(civicData: CitizenMeta["civicData"]): number {
  return civicData.householdSize ?? 1;
}

function hasChildren(civicData: CitizenMeta["civicData"]): boolean {
  const children = civicData.children;
  if (!children) return false;
  if (typeof children === "number") return children > 0;
  if (Array.isArray(children)) return children.length > 0;
  return false;
}

function getIncomeLimit(limits: Record<string, number>, householdSize: number): number {
  const key = String(Math.min(householdSize, 6));
  return limits[key] ?? limits["1"] ?? 0;
}

export function checkEligibility(
  citizen: CitizenMeta,
  rules: BenefitsRulesData,
): EligibilityResult[] {
  const civicData = citizen.civicData;
  const monthlyIncome = getMonthlyIncome(civicData);
  const householdSize = getHouseholdSize(civicData);
  const childrenPresent = hasChildren(civicData);

  return rules.programs.map((program) => {
    const reasons: string[] = [];
    let status: EligibilityStatus = "likely_eligible";

    // Income check
    const incomeLimit = getIncomeLimit(
      program.eligibility.income_limits_monthly,
      householdSize,
    );

    if (incomeLimit > 0 && monthlyIncome > 0) {
      if (monthlyIncome <= incomeLimit) {
        reasons.push(
          `Monthly income ($${monthlyIncome.toLocaleString()}) is within the $${incomeLimit.toLocaleString()} limit for household of ${householdSize}`,
        );
      } else {
        reasons.push(
          `Monthly income ($${monthlyIncome.toLocaleString()}) exceeds the $${incomeLimit.toLocaleString()} limit`,
        );
        status = "likely_ineligible";
      }
    } else if (incomeLimit === 0 && program.eligibility.requires_children) {
      // TANF has 0 limit for household of 1-2 (requires children)
      if (householdSize <= 2 && !childrenPresent) {
        reasons.push("Requires dependent children in household");
        status = "likely_ineligible";
      }
    }

    // Children requirement
    if (program.eligibility.requires_children && !childrenPresent) {
      reasons.push("This program requires dependent children in the household");
      if (status === "likely_eligible") status = "likely_ineligible";
    }

    if (program.eligibility.requires_children_or_pregnant && !childrenPresent) {
      reasons.push("Requires children under 5 or pregnant household member");
      if (status === "likely_eligible") status = "possibly_eligible";
    }

    // Already receiving check
    const currentBenefits = civicData.benefits ?? [];
    const alreadyReceiving = currentBenefits.some(
      (b: string) => b.toLowerCase().includes(program.id) || b.toLowerCase().includes(program.name.toLowerCase()),
    );
    if (alreadyReceiving) {
      reasons.push(`Already receiving ${program.name}`);
      status = "likely_eligible";
    }

    // Add notes if relevant
    if (program.eligibility.notes) {
      reasons.push(program.eligibility.notes);
    }

    return { program, status, reasons };
  });
}

export function sortByEligibility(results: EligibilityResult[]): EligibilityResult[] {
  const order: Record<EligibilityStatus, number> = {
    likely_eligible: 0,
    possibly_eligible: 1,
    unknown: 2,
    likely_ineligible: 3,
  };
  return [...results].sort((a, b) => order[a.status] - order[b.status]);
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Clean build, no errors.

**Step 3: Commit**

```bash
git add montgomery-navigator/src/lib/benefitsEngine.ts
git commit -m "feat(benefits): add eligibility check engine with income threshold logic"
```

---

### Task 4: Create BenefitsCheck UI component

**Files:**
- Create: `montgomery-navigator/src/components/app/BenefitsCheck.tsx`
- Modify: `montgomery-navigator/src/components/app/ProfileView.tsx` (add BenefitsCheck section)

**What this does:** Renders eligibility results as cards on the Profile tab, color-coded by status.

**Step 1: Create BenefitsCheck component**

```typescript
import { useEffect, useState } from "react";
import {
  HeartPulse,
  ShoppingCart,
  Banknote,
  Baby,
  Zap,
  Apple,
  Check,
  AlertTriangle,
  X,
  HelpCircle,
  ExternalLink,
  Phone,
} from "lucide-react";
import type { CitizenMeta } from "@/lib/types";
import {
  checkEligibility,
  sortByEligibility,
  type BenefitsRulesData,
  type EligibilityResult,
  type EligibilityStatus,
} from "@/lib/benefitsEngine";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "heart-pulse": HeartPulse,
  "shopping-cart": ShoppingCart,
  banknote: Banknote,
  baby: Baby,
  zap: Zap,
  apple: Apple,
};

const STATUS_STYLES: Record<EligibilityStatus, { bg: string; border: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  likely_eligible: { bg: "bg-green-50", border: "border-green-200", icon: Check, label: "Likely Eligible" },
  possibly_eligible: { bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle, label: "May Qualify" },
  likely_ineligible: { bg: "bg-red-50", border: "border-red-200", icon: X, label: "Likely Ineligible" },
  unknown: { bg: "bg-gray-50", border: "border-gray-200", icon: HelpCircle, label: "Check Eligibility" },
};

interface BenefitsCheckProps {
  citizen: CitizenMeta;
}

export function BenefitsCheck({ citizen }: BenefitsCheckProps) {
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAndCheck() {
      setLoading(true);
      const resp = await fetch("/data/benefits_rules.json");
      const rules: BenefitsRulesData = await resp.json();
      if (cancelled) return;

      const raw = checkEligibility(citizen, rules);
      setResults(sortByEligibility(raw));
      setLoading(false);
    }

    loadAndCheck();
    return () => { cancelled = true; };
  }, [citizen]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const eligible = results.filter((r) => r.status === "likely_eligible");
  const possible = results.filter((r) => r.status === "possibly_eligible");
  const ineligible = results.filter((r) => r.status === "likely_ineligible");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Benefits Eligibility Check</h3>
        <span className="text-xs text-muted-foreground">
          {eligible.length} eligible, {possible.length} possible
        </span>
      </div>

      {results.map((result) => {
        const style = STATUS_STYLES[result.status];
        const StatusIcon = style.icon;
        const ProgramIcon = ICON_MAP[result.program.icon] ?? HelpCircle;

        return (
          <div
            key={result.program.id}
            className={`rounded-lg border p-4 ${style.bg} ${style.border}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0">
                <ProgramIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{result.program.name}</span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/60">
                    <StatusIcon className="w-3 h-3" />
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{result.program.summary}</p>
                {result.reasons.slice(0, 2).map((reason, i) => (
                  <p key={i} className="text-xs text-foreground/70 leading-relaxed">
                    {reason}
                  </p>
                ))}
                <div className="flex items-center gap-3 mt-2">
                  {result.program.how_to_apply.online && (
                    <a
                      href={result.program.how_to_apply.online}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Apply Online
                    </a>
                  )}
                  {result.program.how_to_apply.phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" /> {result.program.how_to_apply.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Add to ProfileView**

In `montgomery-navigator/src/components/app/ProfileView.tsx`, add the BenefitsCheck component after the "Current Benefits" section.

Add import at top:
```typescript
import { BenefitsCheck } from "./BenefitsCheck";
```

Add section after the existing benefits badges:
```tsx
{/* Benefits Eligibility Check */}
<BenefitsCheck citizen={state.citizenMeta} />
```

**Step 3: Verify build**

Run: `cd montgomery-navigator && npm run build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add montgomery-navigator/src/components/app/BenefitsCheck.tsx montgomery-navigator/src/components/app/ProfileView.tsx
git commit -m "feat(benefits): add eligibility check UI to profile view"
```

---

### Task 5: Create neighborhood scorer library

**Files:**
- Create: `montgomery-navigator/src/lib/neighborhoodScorer.ts`

**What this does:** Loads `neighborhood_scores.geojson`, provides a function to get the score for a given lat/lng.

**Step 1: Create the library**

```typescript
export interface NeighborhoodScore {
  zip: string;
  score: number;
  level: "green" | "yellow" | "red";
  details: {
    "311_requests": number;
    code_violations: number;
    construction_permits: number;
    paving_projects: number;
    flood_risk: number;
  };
}

interface ScoreFeature {
  type: "Feature";
  geometry: { type: string; coordinates: number[][][] };
  properties: NeighborhoodScore;
}

interface ScoreCollection {
  type: "FeatureCollection";
  features: ScoreFeature[];
}

let cachedData: ScoreCollection | null = null;

export async function loadNeighborhoodScores(): Promise<ScoreCollection> {
  if (cachedData) return cachedData;
  const resp = await fetch("/data/neighborhood_scores.geojson");
  cachedData = await resp.json();
  return cachedData!;
}

function pointInBbox(lat: number, lng: number, coords: number[][][]): boolean {
  // Flatten all rings to find bbox
  const allPoints: number[][] = [];
  for (const ring of coords) {
    if (Array.isArray(ring[0]) && typeof ring[0][0] === "number") {
      allPoints.push(...(ring as number[][]));
    } else {
      for (const subring of ring) {
        allPoints.push(...(subring as unknown as number[][]));
      }
    }
  }
  if (allPoints.length === 0) return false;

  const lngs = allPoints.map((p) => p[0]);
  const lats = allPoints.map((p) => p[1]);
  return (
    lng >= Math.min(...lngs) && lng <= Math.max(...lngs) &&
    lat >= Math.min(...lats) && lat <= Math.max(...lats)
  );
}

export function getScoreForLocation(
  lat: number,
  lng: number,
  data: ScoreCollection,
): NeighborhoodScore | null {
  for (const feature of data.features) {
    const coords = feature.geometry.coordinates;
    if (pointInBbox(lat, lng, coords)) {
      return feature.properties;
    }
  }
  return null;
}

export function getScoreColor(level: "green" | "yellow" | "red"): string {
  const colors = { green: "#2D6A4F", yellow: "#C8882A", red: "#d83933" };
  return colors[level];
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build`

**Step 3: Commit**

```bash
git add montgomery-navigator/src/lib/neighborhoodScorer.ts
git commit -m "feat(neighborhood): add score loader and location lookup"
```

---

### Task 6: Create NeighborhoodOverlay map component

**Files:**
- Create: `montgomery-navigator/src/components/app/services/NeighborhoodOverlay.tsx`
- Modify: `montgomery-navigator/src/components/app/services/ServiceMapView.tsx` (add toggle + overlay)

**What this does:** A Leaflet GeoJSON layer that renders color-coded zip code polygons with score popups on the Services map.

**Step 1: Create the overlay component**

```typescript
import { useEffect, useState } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import {
  loadNeighborhoodScores,
  getScoreColor,
  getScoreLabel,
  type NeighborhoodScore,
} from "@/lib/neighborhoodScorer";

interface ScoreCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: string; coordinates: number[][][] };
    properties: NeighborhoodScore;
  }>;
}

function getStyle(feature: { properties: NeighborhoodScore }): PathOptions {
  const color = getScoreColor(feature.properties.level);
  return {
    fillColor: color,
    fillOpacity: 0.25,
    color,
    weight: 1.5,
    opacity: 0.6,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function onEachFeature(
  feature: { properties: NeighborhoodScore },
  layer: Layer,
) {
  const p = feature.properties;
  const label = getScoreLabel(p.score);

  layer.bindPopup(`
    <div style="min-width: 180px">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px">
        ZIP ${p.zip} — ${label}
      </div>
      <div style="font-size: 24px; font-weight: 700; color: ${getScoreColor(p.level)}; margin-bottom: 8px">
        ${p.score}/100
      </div>
      <table style="font-size: 12px; width: 100%">
        <tr><td>311 Requests</td><td style="text-align:right">${formatPercent(p.details["311_requests"])}</td></tr>
        <tr><td>Code Violations</td><td style="text-align:right">${formatPercent(p.details.code_violations)}</td></tr>
        <tr><td>Construction</td><td style="text-align:right">${formatPercent(p.details.construction_permits)}</td></tr>
        <tr><td>Paving Projects</td><td style="text-align:right">${formatPercent(p.details.paving_projects)}</td></tr>
        <tr><td>Flood Risk</td><td style="text-align:right">${formatPercent(p.details.flood_risk)}</td></tr>
      </table>
    </div>
  `);
}

export function NeighborhoodOverlay() {
  const [data, setData] = useState<ScoreCollection | null>(null);

  useEffect(() => {
    loadNeighborhoodScores().then(setData);
  }, []);

  if (!data) return null;

  return (
    <GeoJSON
      key="neighborhood-scores"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data={data as any}
      style={getStyle as any}
      onEachFeature={onEachFeature as any}
    />
  );
}
```

**Step 2: Add toggle to ServiceMapView**

In `ServiceMapView.tsx`, add:

1. Import at top:
```typescript
import { NeighborhoodOverlay } from "./NeighborhoodOverlay";
```

2. Add state for toggle:
```typescript
const [showNeighborhood, setShowNeighborhood] = useState(false);
```

3. Add toggle button near the top of the map container (alongside any existing controls):
```tsx
<button
  onClick={() => setShowNeighborhood(!showNeighborhood)}
  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
    showNeighborhood
      ? "bg-primary text-white"
      : "bg-white text-foreground border border-border hover:bg-muted"
  }`}
>
  {showNeighborhood ? "Hide" : "Show"} Neighborhood Health
</button>
```

4. Inside the `<MapContainer>`, add conditionally:
```tsx
{showNeighborhood && <NeighborhoodOverlay />}
```

**Step 3: Verify build**

Run: `cd montgomery-navigator && npm run build`

**Step 4: Commit**

```bash
git add montgomery-navigator/src/components/app/services/NeighborhoodOverlay.tsx montgomery-navigator/src/components/app/services/ServiceMapView.tsx
git commit -m "feat(services): add neighborhood health score overlay to map"
```

---

### Task 7: Create JobMap component for Career Growth tab

**Files:**
- Create: `montgomery-navigator/src/components/app/cv/JobMap.tsx`
- Modify: `montgomery-navigator/src/components/app/cv/CvUploadView.tsx` (add JobMap section)

**What this does:** Leaflet map on the Career Growth tab showing job pins enriched with transit, childcare, and neighborhood data.

**Step 1: Create the JobMap component**

Build a Leaflet map that:
- Reads `state.jobListings` for job pins (blue circle markers)
- Reads `state.servicePoints` filtered to `childcare` category for childcare pins (pink markers)
- Reads `state.transitRoutes` to show nearest route in popup
- Uses `neighborhoodScorer.ts` to show area score in popup
- Clicking a job pin shows enriched popup: title, company, salary, nearest childcare, nearest bus, neighborhood score

Key implementation details:
- Use `CircleMarker` for jobs (navy fill) and childcare (pink fill)
- Use `Popup` with structured HTML
- Compute nearest childcare via haversine distance in the popup render
- Compute nearest transit route by matching closest timepoint coordinates
- Load neighborhood scores on mount, look up score for each job's lat/lng

The component should be ~100-130 lines. Use the same map tile layer as `CommutePanel.tsx` (OpenStreetMap).

**Step 2: Add to CvUploadView**

Add a "Job Map" section or tab in the Career Growth view that renders `<JobMap />` when the user has job listings loaded.

**Step 3: Verify build**

Run: `cd montgomery-navigator && npm run build`

**Step 4: Commit**

```bash
git add montgomery-navigator/src/components/app/cv/JobMap.tsx montgomery-navigator/src/components/app/cv/CvUploadView.tsx
git commit -m "feat(cv): add enriched job map with transit, childcare, and neighborhood data"
```

---

### Task 8: Create benefits scraper script (Bright Data Web Unlocker)

**Files:**
- Create: `scripts/scrape_benefits.py`

**What this does:** Uses Bright Data Web Unlocker to scrape Alabama Medicaid and DHR websites for current eligibility thresholds. Updates `benefits_rules.json` with fresh data and a `last_scraped` timestamp.

**Step 1: Create the script**

The script should:
1. Use the Web Unlocker API with `data_format: "markdown"` for LLM-friendly output
2. Hit `https://medicaid.alabama.gov` and `https://dhr.alabama.gov` (SNAP/TANF pages)
3. Parse the markdown for income thresholds (regex patterns for dollar amounts + household sizes)
4. Merge new thresholds into existing `benefits_rules.json` (update in-place, preserve structure)
5. Update `last_scraped` timestamp per program
6. Handle errors gracefully — if scraping fails, keep existing data

Use the Bright Data credentials from `.env`:
- API key: `BRIGHTDATA_API_KEY`
- Zone: `web_unlocker1` (or whatever zone is configured)

The script should be runnable standalone: `python scripts/scrape_benefits.py`

**Step 2: Test with a dry run**

Run: `python scripts/scrape_benefits.py --dry-run`
Expected: Prints what it would scrape without making API calls.

**Step 3: Commit**

```bash
git add scripts/scrape_benefits.py
git commit -m "feat(scraper): add Bright Data benefits eligibility scraper"
```

---

### Task 9: Final build verification and visual check

**Step 1: Run full build**

Run: `cd montgomery-navigator && npm run build`
Expected: Clean build, zero errors.

**Step 2: Start dev server**

Run: `cd montgomery-navigator && npm run dev`

**Step 3: Visual checklist**

- [ ] Profile tab: BenefitsCheck cards appear when a persona is selected
- [ ] Profile tab: Switching personas changes eligibility results
- [ ] Profile tab: "Likely Eligible" programs show green, "Likely Ineligible" show red
- [ ] Profile tab: Apply links and phone numbers are clickable
- [ ] Services tab: "Show Neighborhood Health" toggle appears on map view
- [ ] Services tab: Toggling shows color-coded zip polygons
- [ ] Services tab: Clicking a zip polygon shows score popup with breakdown
- [ ] Career Growth tab: Job Map section appears when jobs are loaded
- [ ] Career Growth tab: Job pins show enriched popups with transit + childcare + score

---

## Script Dependency Summary

Run these scripts in order before starting the frontend:

```bash
# 1. Generate neighborhood scores (requires internet for ArcGIS)
cd scripts && python build_neighborhood_scores.py

# 2. Benefits rules already created as static JSON (Task 2)
# No script needed — file created manually

# 3. Jobs already scraped (existing pipeline)
# python job_scraper_service.py trigger --poll
```

## File Summary

| File | Task | Type |
|------|------|------|
| `scripts/build_neighborhood_scores.py` | 1 | New script |
| `public/data/neighborhood_scores.geojson` | 1 | New data |
| `public/data/benefits_rules.json` | 2 | New data |
| `src/lib/benefitsEngine.ts` | 3 | New lib |
| `src/components/app/BenefitsCheck.tsx` | 4 | New component |
| `src/components/app/ProfileView.tsx` | 4 | Modify |
| `src/lib/neighborhoodScorer.ts` | 5 | New lib |
| `src/components/app/services/NeighborhoodOverlay.tsx` | 6 | New component |
| `src/components/app/services/ServiceMapView.tsx` | 6 | Modify |
| `src/components/app/cv/JobMap.tsx` | 7 | New component |
| `src/components/app/cv/CvUploadView.tsx` | 7 | Modify |
| `scripts/scrape_benefits.py` | 8 | New script |
