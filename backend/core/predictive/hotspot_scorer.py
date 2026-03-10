"""Weighted hotspot scoring model for civic predictive analysis.

Formula:
  hotspot_score = 0.4 * complaint_volume
               + 0.3 * complaint_growth_rate
               + 0.2 * event_density
               + 0.1 * negative_sentiment

All inputs are normalized to 0-100 before weighting.
Sentiment is optional (defaults to 0 if unavailable).
"""

from __future__ import annotations

from backend.models import PredictionResult
from backend.core.predictive.mock_data import load_complaints, load_events
from backend.core.predictive.hotspot_helpers import (
    collect_area_stats,
    score_area,
    resolve_risk_level,
    build_hotspot_explanation,
    build_ui_label,
)


def compute_hotspots(
    sentiment_scores: dict[str, float] | None = None,
) -> list[PredictionResult]:
    """Compute hotspot scores for all neighborhoods.

    Args:
        sentiment_scores: Optional dict of {area_id: negative_sentiment_score (0-100)}.
    """
    complaints = load_complaints()
    events = load_events()
    sentiment_scores = sentiment_scores or {}

    area_stats, all_volumes, all_growth_rates, all_event_counts = collect_area_stats(
        complaints, events
    )

    max_volume = max(all_volumes) if all_volumes else 1
    max_growth = max(all_growth_rates) if all_growth_rates else 1
    max_events = max(all_event_counts) if all_event_counts else 1

    results: list[PredictionResult] = []

    for (area_id, neighborhood), stats in area_stats.items():
        drivers, score = score_area(
            area_id, stats, max_volume, max_growth, max_events, sentiment_scores
        )
        risk = resolve_risk_level(score)
        trend = "rising" if stats["growth"] > 20 else ("falling" if stats["growth"] < -20 else "stable")

        results.append(PredictionResult(
            area_id=area_id,
            neighborhood=neighborhood,
            category=stats["top_category"],
            hotspot_score=score,
            risk_level=risk,
            drivers=drivers,
            trend_direction=trend,
            recommended_label_for_ui=build_ui_label(neighborhood, risk, stats["top_category"]),
            explanation=build_hotspot_explanation(
                neighborhood, stats["top_category"], drivers, risk
            ),
        ))

    results.sort(key=lambda r: r.hotspot_score, reverse=True)
    return results
