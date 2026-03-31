"""Drift Detector — compares local fallback prompts against Langfuse versions.

WHAT IS PROMPT DRIFT?
─────────────────────
Drift happens when the prompt in your code (the local fallback) diverges
from the prompt in Langfuse (the source of truth). This can occur when:

1. Someone updates the prompt in Langfuse UI but doesn't update the code
2. Someone updates the code but doesn't update Langfuse
3. A deployment uses the wrong prompt version

WHY DETECT DRIFT?
─────────────────
- Ensures your fallback prompts stay in sync with production
- Catches accidental prompt changes before they cause issues
- Gives you confidence that what's running matches what you expect

HOW TO USE
──────────
Run drift checks at application startup or as a periodic health check:

    report = check_prompt_drift("mayor-chat", MAYOR_CHAT_PROMPT)
    if report.is_drifted:
        logger.warning("Prompt drift detected: %s", report.diff_summary)

DRIFT CHECK FLOW
────────────────
    check_prompt_drift("mayor-chat", local_prompt)
      ├─ Hash local prompt
      ├─ Langfuse available?
      │    ├─ Yes → fetch remote prompt, hash it, compare
      │    │         ├─ Hashes match → DriftReport(status="synced")
      │    │         └─ Hashes differ → DriftReport(status="drifted")
      │    └─ No  → DriftReport(status="unknown")
      └─ Fetch error? → DriftReport(status="unknown")
"""

import hashlib
import logging
from dataclasses import dataclass

from backend.agents.common.monitoring.langfuse_client import get_langfuse

logger = logging.getLogger(__name__)


@dataclass
class DriftReport:
    """Result of a drift check between local and Langfuse prompts.

    Attributes:
        prompt_name: The prompt being checked.
        is_drifted: True if local and remote prompts differ.
        status: "synced", "drifted", or "unknown" (Langfuse unavailable).
        local_hash: MD5 hash of the local prompt (for quick comparison).
        remote_hash: MD5 hash of the remote prompt, or None.
        remote_version: The version number from Langfuse, or None.
        diff_summary: Human-readable description of the drift.
    """

    prompt_name: str
    is_drifted: bool
    status: str  # "synced" | "drifted" | "unknown"
    local_hash: str
    remote_hash: str | None
    remote_version: int | None
    diff_summary: str


def check_prompt_drift(
    prompt_name: str,
    local_prompt: str,
    label: str = "production",
) -> DriftReport:
    """Compare a local prompt string against its Langfuse counterpart.

    Args:
        prompt_name: The prompt name in Langfuse.
        local_prompt: The hardcoded fallback prompt string.
        label: Which Langfuse label to compare against.

    Returns:
        DriftReport describing whether drift was detected.
    """
    local_hash = _hash_prompt(local_prompt)

    client = get_langfuse()
    if client is None:
        return DriftReport(
            prompt_name=prompt_name,
            is_drifted=False,
            status="unknown",
            local_hash=local_hash,
            remote_hash=None,
            remote_version=None,
            diff_summary="Langfuse not configured — cannot check drift",
        )

    try:
        remote_prompt = client.get_prompt(prompt_name, label=label)
        remote_text = remote_prompt.get_langchain_prompt()
        remote_hash = _hash_prompt(remote_text)

        is_drifted = local_hash != remote_hash

        return DriftReport(
            prompt_name=prompt_name,
            is_drifted=is_drifted,
            status="drifted" if is_drifted else "synced",
            local_hash=local_hash,
            remote_hash=remote_hash,
            remote_version=remote_prompt.version,
            diff_summary=_describe_drift(is_drifted, local_prompt, remote_text),
        )

    except Exception as exc:
        logger.warning("Drift check failed for '%s': %s", prompt_name, exc)
        return DriftReport(
            prompt_name=prompt_name,
            is_drifted=False,
            status="unknown",
            local_hash=local_hash,
            remote_hash=None,
            remote_version=None,
            diff_summary=f"Drift check failed: {exc}",
        )


def _hash_prompt(text: str) -> str:
    """Compute a stable hash of a prompt for comparison."""
    normalized = text.strip()
    return hashlib.md5(normalized.encode()).hexdigest()


def _describe_drift(is_drifted: bool, local: str, remote: str) -> str:
    """Generate a human-readable drift summary."""
    if not is_drifted:
        return "Prompts are in sync"

    local_len = len(local.strip())
    remote_len = len(remote.strip())
    diff = abs(local_len - remote_len)

    return (
        f"DRIFT DETECTED — local ({local_len} chars) vs "
        f"remote ({remote_len} chars), difference of {diff} chars. "
        f"Review in Langfuse UI."
    )
