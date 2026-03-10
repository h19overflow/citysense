"""Backward-compat re-export. Real implementation in mayor/prompt.py."""

from backend.agents.mayor.prompt import BATCH_ANALYSIS_PROMPT, MAYOR_CHAT_PROMPT

__all__ = ["BATCH_ANALYSIS_PROMPT", "MAYOR_CHAT_PROMPT"]
