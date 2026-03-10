"""Data models for predictive analysis results."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

RiskLevel = Literal["low", "medium", "high", "critical"]
TrendDirection = Literal["rising", "falling", "stable"]


@dataclass
class HotspotDriver:
    factor: str
    value: float
    weight: float
    contribution: float


@dataclass
class PredictionResult:
    area_id: str
    neighborhood: str
    category: str
    hotspot_score: float
    risk_level: RiskLevel
    drivers: list[HotspotDriver] = field(default_factory=list)
    trend_direction: TrendDirection = "stable"
    recommended_label_for_ui: str = ""
    explanation: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "area_id": self.area_id,
            "neighborhood": self.neighborhood,
            "category": self.category,
            "hotspot_score": round(self.hotspot_score, 2),
            "risk_level": self.risk_level,
            "drivers": [asdict(d) for d in self.drivers],
            "trend_direction": self.trend_direction,
            "recommended_label_for_ui": self.recommended_label_for_ui,
            "explanation": self.explanation,
        }


@dataclass
class TrendResult:
    category: str
    current_volume: int
    previous_volume: int
    growth_rate: float
    trend_direction: TrendDirection
    top_neighborhoods: list[str] = field(default_factory=list)
    explanation: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "current_volume": self.current_volume,
            "previous_volume": self.previous_volume,
            "growth_rate": round(self.growth_rate, 2),
            "trend_direction": self.trend_direction,
            "top_neighborhoods": self.top_neighborhoods,
            "explanation": self.explanation,
        }
