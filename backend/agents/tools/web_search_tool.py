"""Backward-compat re-export. Real implementation in common/web_search.py."""

from backend.agents.common.web_search import search_montgomery_web

__all__ = ["search_montgomery_web"]
