"""Helper functions extracted from hotspot_scorer to keep files under 150 lines."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from backend.core.predictive.hotspot_config import WEIGHTS, RISK_THRESHOLDS, FACTOR_LABELS


def normalize_to_hundred(value: float, max_value: float) -> float:
    """Normalize a value to a 0-100 scale given a maximum reference."""
    if max_value <= 0:
        return 0.0
    return min(100.0, (value / max_value) * 100.0)


def resolve_risk_level(score: float) -> str:
    """Map a numeric hotspot score to a risk level string."""
    for level, threshold in RISK_THRESHOLDS.items():
        if score >= threshold:
            return level
    return "low"


def build_hotspot_explanation(
    neighborhood: str,
    category: str,
    drivers: list[dict],
    risk: str,
) -> str:
    """Build a human-readable explanation of the hotspot score."""
    top_driver = max(drivers, key=lambda d: d["contribution"]) if drivers else None
    if not top_driver:
        return f"{neighborhood} shows normal activity levels."

    factor_name = FACTOR_LABELS.get(top_driver["factor"], top_driver["factor"])

    if risk == "critical":
        return (
            f"{neighborhood} is a critical hotspot for {category} issues, "
            f"primarily driven by {factor_name}."
        )
    if risk == "high":
        return f"{neighborhood} shows elevated {category} activity. Main driver: {factor_name}."
    if risk == "medium":
        return f"{neighborhood} has moderate {category} concerns. Watch for {factor_name}."
    return f"{neighborhood} is currently stable for {category} issues."


def build_ui_label(neighborhood: str, risk: str, category: str) -> str:
    """Build a short UI badge label for a neighborhood hotspot."""
    labels = {
        "critical": f"🔴 {neighborhood}: Critical {category} hotspot",
        "high": f"🟠 {neighborhood}: High {category} risk",
        "medium": f"🟡 {neighborhood}: Moderate {category} activity",
        "low": f"🟢 {neighborhood}: Stable",
    }
    return labels.get(risk, f"{neighborhood}: {category}")


def collect_area_stats(
    complaints: list[dict],
    events: list[dict],
) -> tuple[dict, list, list, list]:
    """Group complaints and events by area and compute per-area stats."""
    area_complaints: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for complaint in complaints:
        key = (complaint["area_id"], complaint["neighborhood"])
        area_complaints[key].append(complaint)

    area_events: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        area_events[event["area_id"]].append(event)

    all_volumes: list[float] = []
    all_growth_rates: list[float] = []
    all_event_counts: list[float] = []
    area_stats: dict[tuple[str, str], dict[str, Any]] = {}

    for (area_id, neighborhood), comps in area_complaints.items():
        jan = [c for c in comps if c["date"].startswith("2026-01")]
        feb = [c for c in comps if c["date"].startswith("2026-02")]

        volume = len(comps)
        growth = ((len(feb) - len(jan)) / max(len(jan), 1)) * 100
        event_count = len(area_events.get(area_id, []))

        cat_counts: dict[str, int] = defaultdict(int)
        for complaint in comps:
            cat_counts[complaint["category"]] += 1
        top_category = max(cat_counts, key=cat_counts.get) if cat_counts else "general"  # type: ignore[arg-type]

        area_stats[(area_id, neighborhood)] = {
            "volume": volume,
            "growth": growth,
            "event_count": event_count,
            "top_category": top_category,
            "jan_count": len(jan),
            "feb_count": len(feb),
        }
        all_volumes.append(volume)
        all_growth_rates.append(abs(growth))
        all_event_counts.append(event_count)

    return area_stats, all_volumes, all_growth_rates, all_event_counts


def score_area(
    area_id: str,
    stats: dict[str, Any],
    max_volume: float,
    max_growth: float,
    max_events: float,
    sentiment_scores: dict[str, float],
) -> tuple[list[dict], float]:
    """Compute normalized driver values and weighted score for one area."""
    norm_volume = normalize_to_hundred(stats["volume"], max_volume)
    norm_growth = normalize_to_hundred(max(stats["growth"], 0), max_growth)
    norm_events = normalize_to_hundred(stats["event_count"], max_events)
    norm_sentiment = sentiment_scores.get(area_id, 0.0)

    weighted_score = (
        WEIGHTS["complaint_volume"] * norm_volume
        + WEIGHTS["complaint_growth_rate"] * norm_growth
        + WEIGHTS["event_density"] * norm_events
        + WEIGHTS["negative_sentiment"] * norm_sentiment
    )

    drivers = [
        {"factor": "complaint_volume", "value": round(norm_volume, 1), "weight": WEIGHTS["complaint_volume"], "contribution": round(WEIGHTS["complaint_volume"] * norm_volume, 1)},
        {"factor": "complaint_growth_rate", "value": round(norm_growth, 1), "weight": WEIGHTS["complaint_growth_rate"], "contribution": round(WEIGHTS["complaint_growth_rate"] * norm_growth, 1)},
        {"factor": "event_density", "value": round(norm_events, 1), "weight": WEIGHTS["event_density"], "contribution": round(WEIGHTS["event_density"] * norm_events, 1)},
        {"factor": "negative_sentiment", "value": round(norm_sentiment, 1), "weight": WEIGHTS["negative_sentiment"], "contribution": round(WEIGHTS["negative_sentiment"] * norm_sentiment, 1)},
    ]

    return drivers, weighted_score
