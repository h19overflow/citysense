"""Trend detection for civic complaint categories.

Compares complaint volumes between periods to detect rising/falling trends.
"""

from __future__ import annotations

from collections import defaultdict

from backend.core.predictive.models import TrendResult
from backend.core.predictive.mock_data import load_complaints


def detect_trends() -> list[TrendResult]:
    """Detect rising/falling trends by complaint category."""
    complaints = load_complaints()

    # Group by category and period
    jan_by_cat: dict[str, list[dict]] = defaultdict(list)
    feb_by_cat: dict[str, list[dict]] = defaultdict(list)
    cat_neighborhoods: dict[str, set[str]] = defaultdict(set)

    for c in complaints:
        cat = c["category"]
        cat_neighborhoods[cat].add(c["neighborhood"])
        if c["date"].startswith("2026-01"):
            jan_by_cat[cat].append(c)
        elif c["date"].startswith("2026-02"):
            feb_by_cat[cat].append(c)

    all_categories = set(jan_by_cat.keys()) | set(feb_by_cat.keys())
    results: list[TrendResult] = []

    for cat in sorted(all_categories):
        jan_count = len(jan_by_cat.get(cat, []))
        feb_count = len(feb_by_cat.get(cat, []))
        growth = ((feb_count - jan_count) / max(jan_count, 1)) * 100

        if growth > 20:
            direction = "rising"
        elif growth < -20:
            direction = "falling"
        else:
            direction = "stable"

        # Top neighborhoods for this category (by Feb volume)
        hood_counts: dict[str, int] = defaultdict(int)
        for c in feb_by_cat.get(cat, []):
            hood_counts[c["neighborhood"]] += 1
        top_hoods = sorted(hood_counts, key=hood_counts.get, reverse=True)[:3]  # type: ignore[arg-type]

        explanation = _build_trend_explanation(cat, jan_count, feb_count, direction, top_hoods)

        results.append(TrendResult(
            category=cat,
            current_volume=feb_count,
            previous_volume=jan_count,
            growth_rate=round(growth, 1),
            trend_direction=direction,
            top_neighborhoods=top_hoods,
            explanation=explanation,
        ))

    results.sort(key=lambda r: abs(r.growth_rate), reverse=True)
    return results


def _build_trend_explanation(
    category: str,
    prev: int,
    curr: int,
    direction: str,
    top_hoods: list[str],
) -> str:
    cat_label = category.replace("_", " ")
    hood_str = ", ".join(top_hoods) if top_hoods else "various areas"

    if direction == "rising":
        return (
            f"{cat_label.title()} complaints rose from {prev} to {curr} "
            f"({curr - prev:+d}). Most concentrated in {hood_str}."
        )
    elif direction == "falling":
        return (
            f"{cat_label.title()} complaints decreased from {prev} to {curr}. "
            f"Improvement seen across {hood_str}."
        )
    else:
        return f"{cat_label.title()} complaints remain stable at {curr} reports. Active in {hood_str}."
