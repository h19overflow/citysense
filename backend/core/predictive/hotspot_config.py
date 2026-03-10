"""Configuration constants for the hotspot scoring model."""

# Scoring weights — must sum to 1.0
WEIGHTS: dict[str, float] = {
    "complaint_volume": 0.4,
    "complaint_growth_rate": 0.3,
    "event_density": 0.2,
    "negative_sentiment": 0.1,
}

# Risk level thresholds (score >= threshold → that level)
RISK_THRESHOLDS: dict[str, int] = {
    "critical": 75,
    "high": 50,
    "medium": 25,
    "low": 0,
}

# Human-readable labels for each scoring factor
FACTOR_LABELS: dict[str, str] = {
    "complaint_volume": "complaint volume",
    "complaint_growth_rate": "rising complaint trend",
    "event_density": "upcoming event activity",
    "negative_sentiment": "negative community sentiment",
}
