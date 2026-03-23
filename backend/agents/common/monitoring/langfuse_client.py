"""Singleton Langfuse client — the foundation of our monitoring layer.

WHY A SINGLETON?
────────────────
Langfuse batches trace data and flushes it periodically. Creating a new client
per request would mean:
  1. Each client has its own flush buffer — more memory, more network calls
  2. Short-lived clients might not flush before garbage collection — lost traces
  3. No connection reuse — higher latency

By using a singleton, all agents share one client with one flush loop.

HOW GRACEFUL DEGRADATION WORKS
──────────────────────────────
If Langfuse credentials are missing (e.g., local dev without keys), get_langfuse()
returns None. Every downstream consumer checks for None and skips monitoring.
This means: monitoring is NEVER a reason for agent failure.

CONNECTION FLOW
───────────────
    get_langfuse()
      ├─ Already initialized? → return cached instance
      ├─ Missing env vars?    → log warning, return None
      └─ All vars present?    → create Langfuse(), cache it, return
"""

import logging
import os

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Module-level singleton state
# ──────────────────────────────────────────────
_langfuse_instance = None
_initialized = False


def get_langfuse():
    """Return the shared Langfuse client, or None if credentials are missing.

    This is the ONLY way to get a Langfuse client in this codebase.
    Never instantiate Langfuse directly — always go through this function.
    """
    global _langfuse_instance, _initialized

    if _initialized:
        return _langfuse_instance

    _initialized = True

    # ── Check for required environment variables ──
    # Langfuse needs all three to connect. If any is missing,
    # we degrade gracefully: no monitoring, but agents still work.
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    base_url = os.environ.get("LANGFUSE_BASE_URL")

    if not all([secret_key, public_key, base_url]):
        logger.warning(
            "Langfuse credentials missing — monitoring disabled. "
            "Set LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL to enable."
        )
        return None

    # ── Create the client ──
    # Import here (not at module top) so the langfuse package
    # is only required when monitoring is actually enabled.
    from langfuse import Langfuse

    # ── Pass credentials explicitly rather than relying on SDK auto-read ──
    # This makes the dependency on env vars visible and avoids silent misconfiguration.
    _langfuse_instance = Langfuse(
        secret_key=secret_key,
        public_key=public_key,
        base_url=base_url,
    )
    logger.info("Langfuse client initialized (host: %s)", base_url)
    return _langfuse_instance


def _reset() -> None:
    """Reset singleton state — used ONLY in tests for isolation."""
    global _langfuse_instance, _initialized
    _langfuse_instance = None
    _initialized = False
