"""Parse government website markdown into structured benefit eligibility data."""

import json
import re
from datetime import datetime, timezone

from backend.config import OUTPUT_FILES


def parse_income_table(markdown: str) -> dict[str, int]:
    """Extract income limits by household size from markdown tables.

    Looks for patterns like:
    | 1 | $1,644 |
    | Household of 2 | $2,229 |
    """
    limits: dict[str, int] = {}
    pattern = r"\|?\s*(?:Household\s+(?:of\s+)?)?(\d+)\s*\|?\s*\$?([\d,]+)"
    for match in re.finditer(pattern, markdown):
        size = match.group(1)
        amount = int(match.group(2).replace(",", ""))
        limits[size] = amount
    return limits


def parse_requirements_list(markdown: str, section_keyword: str) -> list[str]:
    """Extract bullet items under a section heading.

    Finds the heading matching section_keyword, then collects
    all lines starting with - or * until the next heading.
    """
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


def extract_first_paragraph(markdown: str) -> str:
    """Extract the first non-heading, non-empty paragraph."""
    for line in markdown.split("\n"):
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and not stripped.startswith("|") and len(stripped) > 30:
            return stripped[:300]
    return ""


def extract_phone(markdown: str) -> str:
    """Extract first phone number from markdown."""
    match = re.search(r"[\(]?\d{3}[\)\-\s]?\s*\d{3}[\-\s]\d{4}", markdown)
    return match.group(0) if match else ""


def extract_provider(markdown: str) -> str:
    """Extract provider name from first heading."""
    for line in markdown.split("\n"):
        if line.strip().startswith("# "):
            return line.strip().lstrip("# ").strip()[:100]
    return ""


def parse_benefit_markdown(markdown: str, target: dict) -> dict:
    """Parse a single benefit page markdown into structured data."""
    now = datetime.now(timezone.utc).isoformat()

    income_limits = parse_income_table(markdown)
    eligibility = parse_requirements_list(markdown, "eligib")
    how_to_apply = parse_requirements_list(markdown, "apply")
    documents = parse_requirements_list(markdown, "document")

    if not eligibility:
        eligibility = parse_requirements_list(markdown, "qualif")
    if not how_to_apply:
        how_to_apply = parse_requirements_list(markdown, "how to")

    return {
        "id": target["id"],
        "category": target["category"],
        "title": target["name"],
        "provider": extract_provider(markdown) or target["name"],
        "description": extract_first_paragraph(markdown),
        "eligibility": eligibility,
        "income_limits": income_limits,
        "how_to_apply": how_to_apply,
        "documents_needed": documents,
        "url": target["url"],
        "phone": extract_phone(markdown),
        "scraped_at": now,
        "source": "live_scrape",
    }


def load_fallback_services() -> list[dict]:
    """Load existing gov_services.json as fallback data."""
    path = OUTPUT_FILES["benefits"]
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            return data.get("services", [])
    return []


def merge_with_fallback(
    live_services: list[dict],
    fallback_services: list[dict],
) -> list[dict]:
    """Merge live-scraped services with fallback. Live wins on ID match."""
    live_ids = {s["id"] for s in live_services}
    kept_fallback = [s for s in fallback_services if s["id"] not in live_ids]
    return live_services + kept_fallback


def save_benefits(services: list[dict]) -> None:
    """Write enriched benefits data to gov_services.json."""
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_services": len(services),
        "categories": list({s["category"] for s in services}),
        "services": services,
    }

    path = OUTPUT_FILES["benefits"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(services)} services to {path}")
