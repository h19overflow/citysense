"""Shared data models for the AI chatbot and predictive analysis modules."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


# ── Civic Intents ────────────────────────────────────────────

class CivicIntent(str, Enum):
    REPORT_ISSUE = "report_issue"
    FIND_SERVICE = "find_service"
    CITY_EVENTS = "city_events"
    TRAFFIC_DISRUPTION = "traffic_or_disruption_reason"
    NEIGHBORHOOD_SUMMARY = "neighborhood_summary"
    SUGGEST_NEXT_STEP = "suggest_next_step"
    NEW_RESIDENT = "new_resident"
    JOB_LOSS_SUPPORT = "job_loss_support"
    TRENDING_ISSUES = "trending_issues"
    PUBLIC_SAFETY = "public_safety"
    GENERAL = "general"


# ── Chat Models ──────────────────────────────────────────────

@dataclass
class ChatRequest:
    message: str
    conversation_id: str | None = None
    context: dict[str, Any] | None = None


@dataclass
class ExtractedEntities:
    address: str | None = None
    issue_type: str | None = None
    event_name: str | None = None
    neighborhood: str | None = None
    service_category: str | None = None
    date_time: str | None = None


@dataclass
class SourceItem:
    title: str
    description: str
    url: str | None = None
    category: str | None = None


@dataclass
class MapHighlight:
    lat: float
    lng: float
    label: str
    category: str | None = None


@dataclass
class SuggestedAction:
    label: str
    action_type: str = "link"
    url: str | None = None


@dataclass
class ChatResponse:
    intent: str
    answer: str
    confidence: float
    extracted_entities: dict[str, Any] = field(default_factory=dict)
    follow_up_question: str | None = None
    suggested_actions: list[dict[str, Any]] = field(default_factory=list)
    source_items: list[dict[str, Any]] = field(default_factory=list)
    map_highlights: list[dict[str, Any]] = field(default_factory=list)
    chips: list[str] = field(default_factory=list)
    answer_summary: str | None = None
    reasoning_notes: str | None = None
    warnings: list[str] = field(default_factory=list)
    source_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "intent": self.intent,
            "answer": self.answer,
            "confidence": self.confidence,
            "extracted_entities": self.extracted_entities,
            "follow_up_question": self.follow_up_question,
            "suggested_actions": self.suggested_actions,
            "source_items": self.source_items,
            "map_highlights": self.map_highlights,
            "chips": self.chips,
            "answer_summary": self.answer_summary,
            "reasoning_notes": self.reasoning_notes,
            "warnings": self.warnings,
            "source_count": self.source_count,
        }


# ── Conversation Context (lightweight session memory) ────────

@dataclass
class ConversationContext:
    """Lightweight per-session memory for follow-up question support."""
    last_intent: str | None = None
    last_question: str = ""
    last_results: list[dict[str, Any]] = field(default_factory=list)
    last_entities: dict[str, Any] = field(default_factory=dict)
    last_filters: dict[str, str] = field(default_factory=dict)
    last_topic: str = ""           # e.g. "events", "services", "trash", "traffic"
    last_result_type: str = ""     # e.g. "event_list", "service_list", "report_info"
    turn_count: int = 0


# ── Prediction Models ────────────────────────────────────────

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
    risk_level: str  # "low" | "medium" | "high" | "critical"
    drivers: list[dict[str, Any]] = field(default_factory=list)
    trend_direction: str = "stable"  # "rising" | "falling" | "stable"
    recommended_label_for_ui: str = ""
    explanation: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "area_id": self.area_id,
            "neighborhood": self.neighborhood,
            "category": self.category,
            "hotspot_score": round(self.hotspot_score, 2),
            "risk_level": self.risk_level,
            "drivers": self.drivers,
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
    trend_direction: str
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
