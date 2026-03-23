"""Prompt Registry — managed prompt versioning with Langfuse.

WHAT IS PROMPT VERSIONING?
──────────────────────────
Instead of hardcoding prompts in Python files, you store them in Langfuse.
Each prompt has a NAME and multiple VERSIONS. Each version can have LABELS:

    mayor-chat v1  [production]    ← this is what agents use in prod
    mayor-chat v2  [candidate]     ← this is being A/B tested
    mayor-chat v3  [latest]        ← newest, not yet promoted

When you call get_managed_prompt("mayor-chat"), it fetches the version
labeled "production" by default. You can update prompts in the Langfuse
UI without redeploying code.

WHY THIS MATTERS
────────────────
1. **No redeploy to change a prompt** — edit in Langfuse UI, agents pick it up
2. **Version history** — see every prompt change, who made it, when
3. **Rollback** — move the "production" label back to an older version
4. **A/B testing** — run "production" vs "candidate" and compare metrics
5. **Audit trail** — every trace links to the exact prompt version used

HOW THE FALLBACK WORKS
──────────────────────
If Langfuse is down or the prompt doesn't exist yet, we use the LOCAL
fallback (the original hardcoded prompt). This ensures agents never fail
because of a monitoring system outage. The trace is tagged as "fallback"
so you can filter these in the dashboard.

    get_managed_prompt("mayor-chat", fallback=MAYOR_PROMPT)
      ├─ Cache hit?           → return cached ManagedPrompt
      ├─ Langfuse available?  → fetch, cache, return ManagedPrompt
      └─ Langfuse down?       → return fallback ManagedPrompt(is_fallback=True)

CACHE STRATEGY
──────────────
Prompts are cached in-memory with a TTL (default 5 minutes). This avoids
hitting Langfuse on every LLM call while still picking up changes quickly.

    First call:   Langfuse API → cache → return
    Next 5 min:   cache hit → return (no API call)
    After 5 min:  cache expired → Langfuse API → cache → return
"""

import logging
import time
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from backend.agents.common.monitoring.langfuse_client import get_langfuse

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# In-memory prompt cache: key = "name:label"
# ──────────────────────────────────────────────
_prompt_cache: dict[str, dict[str, Any]] = {}
DEFAULT_CACHE_TTL_SECONDS = 300  # 5 minutes


class ManagedPrompt:
    """A prompt fetched from Langfuse with version tracking metadata.

    Attributes:
        template: The prompt string (LangChain-compatible, single-bracket vars).
        langfuse_prompt: The raw Langfuse prompt object (for trace linking).
        version: The version number from Langfuse, or None for fallbacks.
        is_fallback: True if we're using the local fallback instead of Langfuse.
        config: Any config attached to the prompt in Langfuse (model, temp, etc).
    """

    def __init__(
        self,
        template: str,
        langfuse_prompt: Any = None,
        version: int | None = None,
        is_fallback: bool = False,
        config: dict[str, Any] | None = None,
    ):
        self.template = template
        self.langfuse_prompt = langfuse_prompt
        self.version = version
        self.is_fallback = is_fallback
        self.config = config or {}

    def to_chat_prompt(self) -> ChatPromptTemplate:
        """Convert to a LangChain ChatPromptTemplate with Langfuse metadata.

        The metadata={"langfuse_prompt": ...} is the magic that links the
        prompt version to the trace in Langfuse. When the CallbackHandler
        sees this metadata, it records which prompt version was used.
        """
        metadata = {}
        if self.langfuse_prompt is not None:
            # ── This is how Langfuse knows which prompt version produced a trace ──
            metadata["langfuse_prompt"] = self.langfuse_prompt

        return ChatPromptTemplate.from_messages(
            [("system", self.template)],
            metadata=metadata,
        )


def get_managed_prompt(
    name: str,
    fallback: str,
    label: str = "production",
    cache_ttl: int = DEFAULT_CACHE_TTL_SECONDS,
) -> ManagedPrompt:
    """Fetch a managed prompt from Langfuse, falling back to local if unavailable.

    This is the main entry point for prompt versioning. Every agent should
    call this instead of hardcoding ChatPromptTemplate.from_messages().

    Args:
        name: Prompt name in Langfuse (e.g., "mayor-chat").
        fallback: Local prompt string to use if Langfuse is unavailable.
        label: Which label to fetch ("production", "candidate", "latest").
        cache_ttl: How long to cache the prompt in seconds.

    Returns:
        ManagedPrompt with the template string and version metadata.

    Example:
        >>> prompt = get_managed_prompt("mayor-chat", fallback=MAYOR_CHAT_PROMPT)
        >>> chat_template = prompt.to_chat_prompt()  # LangChain-ready
    """
    # ── Check cache first ──
    cache_key = f"{name}:{label}"
    cached = _prompt_cache.get(cache_key)
    if cached and time.time() - cached["fetched_at"] < cache_ttl:
        return cached["prompt"]

    # ── Try Langfuse ──
    client = get_langfuse()
    if client is None:
        return _build_fallback(name, fallback)

    try:
        langfuse_prompt = client.get_prompt(name, label=label)

        # .get_langchain_prompt() converts Langfuse {{var}} → LangChain {var}
        template = langfuse_prompt.get_langchain_prompt()
        managed = ManagedPrompt(
            template=template,
            langfuse_prompt=langfuse_prompt,
            version=langfuse_prompt.version,
            is_fallback=False,
            config=getattr(langfuse_prompt, "config", {}),
        )

        # ── Cache the result ──
        _prompt_cache[cache_key] = {
            "prompt": managed,
            "fetched_at": time.time(),
        }

        logger.info(
            "Fetched prompt '%s' v%d (label=%s) from Langfuse",
            name, managed.version, label,
        )
        return managed

    except Exception as exc:
        logger.warning(
            "Failed to fetch prompt '%s' from Langfuse: %s — using fallback",
            name, exc,
        )
        return _build_fallback(name, fallback)


def _build_fallback(name: str, fallback: str) -> ManagedPrompt:
    """Wrap a local fallback prompt as a ManagedPrompt tagged as fallback."""
    return ManagedPrompt(
        template=fallback,
        langfuse_prompt=None,
        version=None,
        is_fallback=True,
    )


def _clear_cache() -> None:
    """Clear the prompt cache — used ONLY in tests."""
    _prompt_cache.clear()
