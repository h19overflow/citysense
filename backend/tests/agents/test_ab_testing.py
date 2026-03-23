"""Tests for the A/B testing module."""

import pytest


class TestSelectPromptVariant:
    """Test weighted variant selection."""

    def test_selects_variant_based_on_weight(self):
        """With 100% weight on one variant, always selects it."""
        from backend.agents.common.monitoring.ab_testing import select_prompt_variant
        variants = [
            {"label": "production", "weight": 1.0},
            {"label": "candidate", "weight": 0.0},
        ]
        selected = select_prompt_variant("test-prompt", variants)
        assert selected == "production"

    def test_returns_production_when_no_variants(self):
        """With empty variants list, defaults to 'production'."""
        from backend.agents.common.monitoring.ab_testing import select_prompt_variant
        selected = select_prompt_variant("test-prompt", [])
        assert selected == "production"

    def test_respects_weight_distribution(self):
        """Over many selections, distribution roughly matches weights."""
        from backend.agents.common.monitoring.ab_testing import select_prompt_variant
        variants = [
            {"label": "production", "weight": 0.7},
            {"label": "candidate", "weight": 0.3},
        ]
        counts = {"production": 0, "candidate": 0}
        for _ in range(1000):
            selected = select_prompt_variant("test-prompt", variants)
            counts[selected] += 1
        # With 1000 samples, production should be roughly 600-800
        assert 550 < counts["production"] < 850

    def test_supports_multiple_variants(self):
        """Can select from more than two variants."""
        from backend.agents.common.monitoring.ab_testing import select_prompt_variant
        variants = [
            {"label": "v1", "weight": 0.5},
            {"label": "v2", "weight": 0.3},
            {"label": "v3", "weight": 0.2},
        ]
        results = set()
        for _ in range(500):
            results.add(select_prompt_variant("test", variants))
        # All three should appear at least once in 500 tries
        assert len(results) == 3
