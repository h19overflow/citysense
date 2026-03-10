"""Read-only tools for predictive hotspot and trend analysis.

Each tool calls the existing scoring/trend engines and returns
formatted text the mayor agent can use in its response.
"""

from backend.core.predictive.hotspot_scorer import compute_hotspots
from backend.core.predictive.trend_detector import detect_trends


def get_predictive_hotspots(neighborhood: str | None = None, risk_level: str | None = None) -> str:
    """Get predictive hotspot scores for neighborhoods, optionally filtered."""
    results = compute_hotspots()

    if neighborhood:
        results = [r for r in results if r.neighborhood.lower() == neighborhood.lower()]
    if risk_level:
        results = [r for r in results if r.risk_level == risk_level.lower()]

    if not results:
        filters = []
        if neighborhood:
            filters.append(f"neighborhood={neighborhood}")
        if risk_level:
            filters.append(f"risk_level={risk_level}")
        return f"No hotspots found matching filters: {', '.join(filters)}"

    lines = [f"Predictive Hotspots ({len(results)} areas):"]
    for r in results[:10]:
        driver_summary = ", ".join(
            f"{d['factor']}={d['contribution']:.1f}" for d in sorted(r.drivers, key=lambda d: d["contribution"], reverse=True)[:2]
        )
        lines.append(
            f"- {r.recommended_label_for_ui} | score={r.hotspot_score:.1f} | "
            f"trend={r.trend_direction} | top drivers: {driver_summary}"
        )
        lines.append(f"  {r.explanation}")

    return "\n".join(lines)


def get_predictive_trends(category: str | None = None) -> str:
    """Get complaint trend analysis by category, optionally filtered."""
    results = detect_trends()

    if category:
        results = [r for r in results if r.category.lower() == category.lower()]

    if not results:
        return f"No trend data found{' for category: ' + category if category else ''}."

    lines = [f"Complaint Trends ({len(results)} categories):"]
    for r in results:
        direction_icon = {"rising": "↑", "falling": "↓", "stable": "→"}.get(r.trend_direction, "→")
        neighborhoods = ", ".join(r.top_neighborhoods) if r.top_neighborhoods else "N/A"
        lines.append(
            f"- {direction_icon} {r.category}: {r.previous_volume} → {r.current_volume} "
            f"({r.growth_rate:+.1f}%) | top areas: {neighborhoods}"
        )
        lines.append(f"  {r.explanation}")

    return "\n".join(lines)
