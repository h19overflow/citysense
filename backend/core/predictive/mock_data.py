"""Load mock civic complaint and event data for the predictive engine."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_complaints() -> list[dict[str, Any]]:
    path = DATA_DIR / "mock_complaints.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("complaints", [])


def load_events() -> list[dict[str, Any]]:
    path = DATA_DIR / "mock_events.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("events", [])
