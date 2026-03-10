"""Tests for predictive hotspot scoring and trend detection."""

from unittest.mock import patch

import pytest

from backend.core.predictive.hotspot_scorer import compute_hotspots
from backend.core.predictive.hotspot_helpers import normalize_to_hundred as _normalize, resolve_risk_level as _risk_level
from backend.core.predictive.trend_detector import detect_trends


MOCK_COMPLAINTS = [
    {"area_id": "a1", "neighborhood": "Downtown", "category": "infrastructure", "date": "2026-01-05"},
    {"area_id": "a1", "neighborhood": "Downtown", "category": "infrastructure", "date": "2026-01-12"},
    {"area_id": "a1", "neighborhood": "Downtown", "category": "infrastructure", "date": "2026-02-03"},
    {"area_id": "a1", "neighborhood": "Downtown", "category": "infrastructure", "date": "2026-02-10"},
    {"area_id": "a1", "neighborhood": "Downtown", "category": "infrastructure", "date": "2026-02-15"},
    {"area_id": "a2", "neighborhood": "Eastdale", "category": "public_safety", "date": "2026-01-08"},
    {"area_id": "a2", "neighborhood": "Eastdale", "category": "public_safety", "date": "2026-02-08"},
]

MOCK_EVENTS = [
    {"area_id": "a1", "name": "Town Hall", "date": "2026-02-20"},
    {"area_id": "a1", "name": "Festival", "date": "2026-02-25"},
]


class TestNormalize:
    def test_normal_value(self):
        assert _normalize(50, 100) == 50.0

    def test_zero_max(self):
        assert _normalize(10, 0) == 0.0

    def test_caps_at_100(self):
        assert _normalize(200, 100) == 100.0


class TestRiskLevel:
    def test_critical(self):
        assert _risk_level(80) == "critical"

    def test_high(self):
        assert _risk_level(60) == "high"

    def test_medium(self):
        assert _risk_level(30) == "medium"

    def test_low(self):
        assert _risk_level(10) == "low"


class TestComputeHotspots:
    @patch("backend.core.predictive.hotspot_scorer.load_events", return_value=MOCK_EVENTS)
    @patch("backend.core.predictive.hotspot_scorer.load_complaints", return_value=MOCK_COMPLAINTS)
    def test_returns_results(self, mock_complaints, mock_events):
        results = compute_hotspots()
        assert len(results) >= 1
        assert all(hasattr(r, "hotspot_score") for r in results)

    @patch("backend.core.predictive.hotspot_scorer.load_events", return_value=MOCK_EVENTS)
    @patch("backend.core.predictive.hotspot_scorer.load_complaints", return_value=MOCK_COMPLAINTS)
    def test_sorted_by_score_descending(self, mock_complaints, mock_events):
        results = compute_hotspots()
        scores = [r.hotspot_score for r in results]
        assert scores == sorted(scores, reverse=True)

    @patch("backend.core.predictive.hotspot_scorer.load_events", return_value=MOCK_EVENTS)
    @patch("backend.core.predictive.hotspot_scorer.load_complaints", return_value=MOCK_COMPLAINTS)
    def test_has_valid_risk_levels(self, mock_complaints, mock_events):
        results = compute_hotspots()
        valid_levels = {"low", "medium", "high", "critical"}
        assert all(r.risk_level in valid_levels for r in results)

    @patch("backend.core.predictive.hotspot_scorer.load_events", return_value=[])
    @patch("backend.core.predictive.hotspot_scorer.load_complaints", return_value=[])
    def test_empty_data_returns_empty(self, mock_complaints, mock_events):
        results = compute_hotspots()
        assert results == []


class TestDetectTrends:
    @patch("backend.core.predictive.trend_detector.load_complaints", return_value=MOCK_COMPLAINTS)
    def test_returns_trend_results(self, mock_complaints):
        results = detect_trends()
        assert len(results) >= 1
        assert all(hasattr(r, "trend_direction") for r in results)

    @patch("backend.core.predictive.trend_detector.load_complaints", return_value=MOCK_COMPLAINTS)
    def test_valid_trend_directions(self, mock_complaints):
        results = detect_trends()
        valid_directions = {"rising", "falling", "stable"}
        assert all(r.trend_direction in valid_directions for r in results)

    @patch("backend.core.predictive.trend_detector.load_complaints", return_value=MOCK_COMPLAINTS)
    def test_sorted_by_growth_rate(self, mock_complaints):
        results = detect_trends()
        abs_rates = [abs(r.growth_rate) for r in results]
        assert abs_rates == sorted(abs_rates, reverse=True)

    @patch("backend.core.predictive.trend_detector.load_complaints", return_value=[])
    def test_empty_data(self, mock_complaints):
        results = detect_trends()
        assert results == []
