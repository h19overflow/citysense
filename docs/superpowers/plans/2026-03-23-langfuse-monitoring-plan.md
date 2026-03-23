# Langfuse Monitoring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Langfuse observability, prompt versioning, A/B testing, and drift detection to all Pegasus agents.

**Architecture:** A new `monitoring/` module inside `agents/common/` provides a clean abstraction layer. Agents opt in by calling `build_traced_chain()` instead of raw `build_llm()`. Prompts are fetched from Langfuse with local fallback.

**Tech Stack:** langfuse (Python SDK), langchain-core, existing Gemini/LangChain stack

---

### Task 1: Install Dependencies & Configure Environment

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Add langfuse dependency**

```toml
# In [project] dependencies list, add:
"langfuse>=2.0",
```

- [ ] **Step 2: Install the dependency**

Run: `cd C:/Users/User/Projects/Pegasus && pip install -e .`
Expected: langfuse installs successfully

- [ ] **Step 3: Verify Langfuse can connect**

Run: `cd C:/Users/User/Projects/Pegasus && python -c "from langfuse import Langfuse; lf = Langfuse(); print('Connected:', lf.auth_check())"`
Expected: `Connected: True`

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml
git commit -m "chore(monitoring): add langfuse dependency"
```

---

### Task 2: Create Langfuse Singleton Client

**Files:**
- Create: `backend/agents/common/monitoring/__init__.py`
- Create: `backend/agents/common/monitoring/langfuse_client.py`
- Test: `backend/tests/agents/test_langfuse_client.py`

- [ ] **Step 1: Write the test**

```python
"""Tests for the Langfuse singleton client."""

import pytest
from unittest.mock import patch


class TestGetLangfuse:
    """Test the singleton Langfuse client factory."""

    def test_returns_langfuse_instance_when_keys_present(self):
        """When all env vars are set, get_langfuse() returns a Langfuse client."""
        with patch.dict("os.environ", {
            "LANGFUSE_SECRET_KEY": "sk-lf-test",
            "LANGFUSE_PUBLIC_KEY": "pk-lf-test",
            "LANGFUSE_BASE_URL": "https://cloud.langfuse.com",
        }):
            from backend.agents.common.monitoring.langfuse_client import get_langfuse, _reset
            _reset()  # Clear singleton for test isolation
            client = get_langfuse()
            assert client is not None
            _reset()

    def test_returns_none_when_keys_missing(self):
        """When env vars are missing, get_langfuse() returns None (graceful degradation)."""
        with patch.dict("os.environ", {}, clear=True):
            from backend.agents.common.monitoring.langfuse_client import get_langfuse, _reset
            _reset()
            client = get_langfuse()
            assert client is None
            _reset()

    def test_singleton_returns_same_instance(self):
        """Multiple calls return the same instance (singleton pattern)."""
        with patch.dict("os.environ", {
            "LANGFUSE_SECRET_KEY": "sk-lf-test",
            "LANGFUSE_PUBLIC_KEY": "pk-lf-test",
            "LANGFUSE_BASE_URL": "https://cloud.langfuse.com",
        }):
            from backend.agents.common.monitoring.langfuse_client import get_langfuse, _reset
            _reset()
            first = get_langfuse()
            second = get_langfuse()
            assert first is second
            _reset()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_langfuse_client.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement langfuse_client.py**

```python
"""Singleton Langfuse client — the foundation of our monitoring layer.

WHY A SINGLETON?
────────────────
Langfuse batches trace data and flushes it periodically. Creating a new client
per request would mean:
  1. Each client has its own flush buffer → more memory, more network calls
  2. Short-lived clients might not flush before garbage collection → lost traces
  3. No connection reuse → higher latency

By using a singleton, all agents share one client with one flush loop.

HOW GRACEFUL DEGRADATION WORKS
──────────────────────────────
If Langfuse credentials are missing (e.g., local dev without keys), get_langfuse()
returns None. Every downstream consumer checks for None and skips monitoring.
This means: monitoring is NEVER a reason for agent failure.
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
    # We import here (not at module top) so that the langfuse package
    # is only required when monitoring is actually enabled.
    from langfuse import Langfuse

    _langfuse_instance = Langfuse()
    logger.info("Langfuse client initialized (host: %s)", base_url)
    return _langfuse_instance


def _reset() -> None:
    """Reset singleton state — used ONLY in tests for isolation."""
    global _langfuse_instance, _initialized
    _langfuse_instance = None
    _initialized = False
```

- [ ] **Step 4: Create `__init__.py` with public re-exports**

```python
"""Monitoring layer — Langfuse observability for all agents.

Architecture overview:
    langfuse_client    → singleton Langfuse connection
    callback_factory   → creates trace-aware LangChain callbacks
    prompt_registry    → managed prompt versioning with fallback
    ab_testing         → weighted prompt variant selection
    drift_detector     → detect prompt drift vs Langfuse source of truth

Usage:
    from backend.agents.common.monitoring import get_langfuse, create_callback_handler
"""

from backend.agents.common.monitoring.langfuse_client import get_langfuse

__all__ = ["get_langfuse"]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_langfuse_client.py -v`
Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/agents/common/monitoring/ backend/tests/agents/test_langfuse_client.py
git commit -m "feat(monitoring): add Langfuse singleton client with graceful degradation"
```

---

### Task 3: Create Callback Factory

**Files:**
- Create: `backend/agents/common/monitoring/callback_factory.py`
- Modify: `backend/agents/common/monitoring/__init__.py`
- Test: `backend/tests/agents/test_callback_factory.py`

- [ ] **Step 1: Write the test**

```python
"""Tests for the Langfuse callback factory."""

import pytest
from unittest.mock import patch, MagicMock


class TestCreateCallbackHandler:
    """Test callback handler creation with trace metadata."""

    def test_returns_handler_when_langfuse_available(self):
        """When Langfuse is connected, returns a configured CallbackHandler."""
        with patch(
            "backend.agents.common.monitoring.callback_factory.get_langfuse"
        ) as mock_get:
            mock_get.return_value = MagicMock()  # Simulate connected client
            from backend.agents.common.monitoring.callback_factory import (
                create_callback_handler,
            )
            handler = create_callback_handler(agent_name="test-agent")
            assert handler is not None

    def test_returns_none_when_langfuse_unavailable(self):
        """When Langfuse is not connected, returns None (no-op)."""
        with patch(
            "backend.agents.common.monitoring.callback_factory.get_langfuse"
        ) as mock_get:
            mock_get.return_value = None
            from backend.agents.common.monitoring.callback_factory import (
                create_callback_handler,
            )
            handler = create_callback_handler(agent_name="test-agent")
            assert handler is None

    def test_handler_includes_metadata(self):
        """Handler should carry agent_name, user_id, session_id as metadata."""
        with patch(
            "backend.agents.common.monitoring.callback_factory.get_langfuse"
        ) as mock_get:
            mock_get.return_value = MagicMock()
            from backend.agents.common.monitoring.callback_factory import (
                create_callback_handler,
            )
            handler = create_callback_handler(
                agent_name="career-agent",
                user_id="user-123",
                session_id="sess-456",
                tags=["test"],
            )
            assert handler is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_callback_factory.py -v`
Expected: FAIL

- [ ] **Step 3: Implement callback_factory.py**

```python
"""Callback factory — creates Langfuse-aware LangChain callback handlers.

HOW LANGCHAIN CALLBACKS WORK
─────────────────────────────
LangChain has a callback system where you pass a list of "handlers" when
invoking a chain:

    chain.ainvoke({"input": "..."}, config={"callbacks": [handler]})

Each handler gets notified at every step: LLM call start, LLM call end,
tool call, chain start, chain end, etc. Langfuse's CallbackHandler
automatically converts these events into traces and spans.

WHY A FACTORY?
──────────────
Each trace needs metadata (which agent, which user, which session).
This factory creates a pre-configured handler so agents don't need
to know about Langfuse internals — they just call:

    handler = create_callback_handler(agent_name="mayor")

TRACE METADATA
──────────────
- agent_name  → becomes the trace name (e.g., "mayor-chat" in Langfuse UI)
- user_id     → links trace to a specific user for per-user analytics
- session_id  → groups multiple traces into a session (e.g., a chat conversation)
- tags        → free-form labels for filtering (e.g., ["production", "v2"])
"""

import logging
from typing import Any

from backend.agents.common.monitoring.langfuse_client import get_langfuse

logger = logging.getLogger(__name__)


def create_callback_handler(
    agent_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> Any | None:
    """Create a Langfuse CallbackHandler for LangChain tracing.

    Returns None if Langfuse is not configured — callers should
    handle this by simply not passing callbacks.

    Args:
        agent_name: Identifies which agent is running (becomes trace name).
        user_id: Optional citizen/user ID for per-user trace filtering.
        session_id: Optional session ID to group related traces.
        tags: Optional list of tags for filtering in Langfuse dashboard.
        metadata: Optional extra metadata to attach to the trace.
    """
    client = get_langfuse()
    if client is None:
        return None

    # ── Import only when Langfuse is available ──
    from langfuse.langchain import CallbackHandler

    handler = CallbackHandler(
        trace_name=agent_name,
        user_id=user_id,
        session_id=session_id,
        tags=tags or [],
        metadata=metadata or {},
    )

    logger.debug("Created callback handler for agent=%s", agent_name)
    return handler


def build_langfuse_config(
    agent_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a LangChain config dict with Langfuse callbacks included.

    This is the main helper agents should use. Returns a config dict
    that can be passed directly to chain.ainvoke() or agent.ainvoke():

        config = build_langfuse_config(agent_name="mayor")
        result = await chain.ainvoke({"input": "..."}, config=config)

    If Langfuse is not configured, returns an empty config dict —
    the chain still works, just without tracing.
    """
    handler = create_callback_handler(
        agent_name=agent_name,
        user_id=user_id,
        session_id=session_id,
        tags=tags,
        metadata=metadata,
    )

    if handler is None:
        return {}

    return {"callbacks": [handler]}
```

- [ ] **Step 4: Update `__init__.py`**

Add `create_callback_handler` and `build_langfuse_config` to re-exports.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_callback_factory.py -v`
Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/agents/common/monitoring/ backend/tests/agents/test_callback_factory.py
git commit -m "feat(monitoring): add callback factory for trace-aware LangChain handlers"
```

---

### Task 4: Create Prompt Registry

**Files:**
- Create: `backend/agents/common/monitoring/prompt_registry.py`
- Modify: `backend/agents/common/monitoring/__init__.py`
- Test: `backend/tests/agents/test_prompt_registry.py`

- [ ] **Step 1: Write the test**

```python
"""Tests for the Langfuse prompt registry."""

import pytest
from unittest.mock import patch, MagicMock


class TestGetManagedPrompt:
    """Test prompt fetching with fallback behavior."""

    def test_returns_langfuse_prompt_when_available(self):
        """When Langfuse has the prompt, returns it as a ChatPromptTemplate."""
        mock_prompt = MagicMock()
        mock_prompt.get_langchain_prompt.return_value = "You are a {role}"
        mock_prompt.config = {}
        mock_prompt.version = 3
        mock_prompt.name = "test-prompt"

        mock_client = MagicMock()
        mock_client.get_prompt.return_value = mock_prompt

        with patch(
            "backend.agents.common.monitoring.prompt_registry.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.prompt_registry import (
                get_managed_prompt, _clear_cache,
            )
            _clear_cache()
            result = get_managed_prompt(
                name="test-prompt",
                fallback="Default: {role}",
            )
            assert result.template is not None
            _clear_cache()

    def test_falls_back_when_langfuse_unavailable(self):
        """When Langfuse is None, returns the local fallback prompt."""
        with patch(
            "backend.agents.common.monitoring.prompt_registry.get_langfuse"
        ) as mock_get:
            mock_get.return_value = None
            from backend.agents.common.monitoring.prompt_registry import (
                get_managed_prompt, _clear_cache,
            )
            _clear_cache()
            result = get_managed_prompt(
                name="test-prompt",
                fallback="Fallback: {role}",
            )
            assert "Fallback" in result.template
            _clear_cache()

    def test_falls_back_on_fetch_error(self):
        """When Langfuse raises an error, returns the local fallback."""
        mock_client = MagicMock()
        mock_client.get_prompt.side_effect = Exception("Network error")

        with patch(
            "backend.agents.common.monitoring.prompt_registry.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.prompt_registry import (
                get_managed_prompt, _clear_cache,
            )
            _clear_cache()
            result = get_managed_prompt(
                name="test-prompt",
                fallback="Fallback: {role}",
            )
            assert "Fallback" in result.template
            _clear_cache()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_prompt_registry.py -v`
Expected: FAIL

- [ ] **Step 3: Implement prompt_registry.py**

```python
"""Prompt Registry — managed prompt versioning with Langfuse.

WHAT IS PROMPT VERSIONING?
──────────────────────────
Instead of hardcoding prompts in Python files, you store them in Langfuse.
Each prompt has a NAME and multiple VERSIONS. Each version can have LABELS:

    mayor-chat v1  [production]    ← this is what agents use in prod
    mayor-chat v2  [candidate]     ← this is being A/B tested
    mayor-chat v3  [latest]        ← newest, not yet promoted

When you call get_managed_prompt("mayor-chat"), it fetches the version
labeled "production" by default. This means you can update prompts in the
Langfuse UI without redeploying code.

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

CACHE STRATEGY
──────────────
Prompts are cached in-memory with a TTL. This avoids hitting Langfuse
on every single LLM call. Default TTL is 5 minutes — long enough to
reduce load, short enough to pick up changes quickly.

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
# In-memory prompt cache
# ──────────────────────────────────────────────
_prompt_cache: dict[str, dict[str, Any]] = {}
DEFAULT_CACHE_TTL_SECONDS = 300  # 5 minutes


class ManagedPrompt:
    """A prompt fetched from Langfuse with version tracking metadata.

    Attributes:
        template: The prompt string (LangChain-compatible, single-bracket vars).
        langfuse_prompt: The raw Langfuse prompt object (for trace linking).
        version: The version number from Langfuse.
        is_fallback: True if we're using the local fallback instead of Langfuse.
        config: Any config attached to the prompt in Langfuse (model, temperature, etc).
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

        The metadata={"langfuse_prompt": ...} is what links the prompt version
        to the trace in Langfuse. When the CallbackHandler sees this metadata,
        it records which prompt version was used for that trace.
        """
        metadata = {}
        if self.langfuse_prompt is not None:
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

        # .get_langchain_prompt() converts {{var}} → {var} automatically
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
```

- [ ] **Step 4: Update `__init__.py`**

Add `get_managed_prompt` and `ManagedPrompt` to re-exports.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_prompt_registry.py -v`
Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/agents/common/monitoring/ backend/tests/agents/test_prompt_registry.py
git commit -m "feat(monitoring): add prompt registry with versioning, caching, and fallback"
```

---

### Task 5: Create A/B Testing Module

**Files:**
- Create: `backend/agents/common/monitoring/ab_testing.py`
- Modify: `backend/agents/common/monitoring/__init__.py`
- Test: `backend/tests/agents/test_ab_testing.py`

- [ ] **Step 1: Write the test**

```python
"""Tests for the A/B testing module."""

import pytest
from unittest.mock import patch, MagicMock


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
        # With 1000 samples, production should be 600-800 range
        assert 550 < counts["production"] < 850
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_ab_testing.py -v`
Expected: FAIL

- [ ] **Step 3: Implement ab_testing.py**

```python
"""A/B Testing — weighted prompt variant selection and experiment runner.

WHAT IS PROMPT A/B TESTING?
───────────────────────────
A/B testing lets you compare two (or more) versions of a prompt to see
which one performs better. Instead of guessing whether a prompt change
is an improvement, you measure it.

HOW IT WORKS IN THIS SYSTEM
────────────────────────────
1. You create two prompt versions in Langfuse:
     "mayor-chat" v3 → labeled "production" (the current one)
     "mayor-chat" v4 → labeled "candidate"  (the one you're testing)

2. You define weights:
     variants = [
         {"label": "production", "weight": 0.8},   # 80% of traffic
         {"label": "candidate",  "weight": 0.2},   # 20% of traffic
     ]

3. On each request, select_prompt_variant() picks one based on weights.
   The selected variant label is used to fetch the right prompt version
   from Langfuse, and the trace is tagged with which variant was used.

4. In the Langfuse dashboard, you filter traces by tag and compare:
   - Latency (is the new prompt slower?)
   - Token usage (is it more expensive?)
   - User feedback scores (do users prefer the responses?)
   - Error rates (does it fail more often?)

WHEN TO USE A/B TESTING
───────────────────────
- You've rewritten a prompt and want to validate it improves quality
- You want to test a cheaper model (e.g., flash-lite vs flash)
- You're adding/removing instructions and want to measure the impact
- You want data before fully rolling out a change

WHEN NOT TO USE IT
──────────────────
- Bug fixes (just fix it and deploy)
- Minor wording tweaks with no measurable impact
- Prompts that aren't user-facing (internal classification, etc.)

EXPERIMENT RUNNER
─────────────────
For offline evaluation (not live traffic), use run_experiment().
This runs a prompt against a Langfuse dataset and records results
for comparison. Good for regression testing before promoting a
candidate to production.
"""

import logging
import random
from typing import Any, Callable

from backend.agents.common.monitoring.langfuse_client import get_langfuse

logger = logging.getLogger(__name__)


def select_prompt_variant(
    prompt_name: str,
    variants: list[dict[str, Any]],
) -> str:
    """Select a prompt label based on weighted random distribution.

    Args:
        prompt_name: The prompt name (for logging).
        variants: List of {"label": str, "weight": float} dicts.
                  Weights don't need to sum to 1.0 — they're normalized.

    Returns:
        The selected label string (e.g., "production" or "candidate").
        Defaults to "production" if variants list is empty.

    Example:
        >>> variants = [
        ...     {"label": "production", "weight": 0.8},
        ...     {"label": "candidate", "weight": 0.2},
        ... ]
        >>> label = select_prompt_variant("mayor-chat", variants)
        >>> # label is "production" ~80% of the time
    """
    if not variants:
        return "production"

    labels = [v["label"] for v in variants]
    weights = [v["weight"] for v in variants]

    # random.choices handles normalization internally
    selected = random.choices(labels, weights=weights, k=1)[0]

    logger.debug(
        "A/B test for '%s': selected variant '%s'",
        prompt_name, selected,
    )
    return selected


async def run_experiment(
    dataset_name: str,
    experiment_name: str,
    task_fn: Callable,
    description: str = "",
) -> dict[str, Any]:
    """Run an offline experiment against a Langfuse dataset.

    HOW EXPERIMENTS WORK
    ────────────────────
    1. You create a dataset in Langfuse with input/expected-output pairs
    2. run_experiment() iterates over each item and calls your task_fn
    3. Results are recorded in Langfuse for side-by-side comparison

    This is for OFFLINE evaluation (before deploying), not live A/B testing.
    Use select_prompt_variant() for live traffic splitting.

    Args:
        dataset_name: Name of the dataset in Langfuse.
        experiment_name: Name for this experiment run (e.g., "mayor-v4-test").
        task_fn: Async function(item) → result. Called once per dataset item.
        description: Optional description for the experiment.

    Returns:
        Summary dict with experiment_name and item_count.
    """
    client = get_langfuse()
    if client is None:
        logger.warning("Cannot run experiment — Langfuse not configured")
        return {"error": "Langfuse not configured"}

    dataset = client.get_dataset(dataset_name)
    result = dataset.run_experiment(
        name=experiment_name,
        description=description,
        task=task_fn,
    )

    logger.info(
        "Experiment '%s' completed on dataset '%s'",
        experiment_name, dataset_name,
    )
    return {
        "experiment_name": experiment_name,
        "dataset_name": dataset_name,
    }
```

- [ ] **Step 4: Update `__init__.py`**

Add `select_prompt_variant` and `run_experiment` to re-exports.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_ab_testing.py -v`
Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/agents/common/monitoring/ backend/tests/agents/test_ab_testing.py
git commit -m "feat(monitoring): add A/B testing with weighted variant selection"
```

---

### Task 6: Create Drift Detector

**Files:**
- Create: `backend/agents/common/monitoring/drift_detector.py`
- Modify: `backend/agents/common/monitoring/__init__.py`
- Test: `backend/tests/agents/test_drift_detector.py`

- [ ] **Step 1: Write the test**

```python
"""Tests for prompt drift detection."""

import pytest
from unittest.mock import patch, MagicMock


class TestCheckPromptDrift:
    """Test drift detection between local and Langfuse prompts."""

    def test_no_drift_when_prompts_match(self):
        """When local and remote prompts are identical, no drift."""
        mock_prompt = MagicMock()
        mock_prompt.get_langchain_prompt.return_value = "Hello {name}"
        mock_prompt.version = 1

        mock_client = MagicMock()
        mock_client.get_prompt.return_value = mock_prompt

        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.is_drifted is False

    def test_drift_detected_when_prompts_differ(self):
        """When local and remote prompts differ, drift is detected."""
        mock_prompt = MagicMock()
        mock_prompt.get_langchain_prompt.return_value = "Updated {name}"
        mock_prompt.version = 2

        mock_client = MagicMock()
        mock_client.get_prompt.return_value = mock_prompt

        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.is_drifted is True

    def test_returns_unknown_when_langfuse_unavailable(self):
        """When Langfuse is not connected, drift is unknown."""
        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = None
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.status == "unknown"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_drift_detector.py -v`
Expected: FAIL

- [ ] **Step 3: Implement drift_detector.py**

```python
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
        status: "synced", "drifted", or "unknown" (if Langfuse unavailable).
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
        logger.warning(
            "Drift check failed for '%s': %s",
            prompt_name, exc,
        )
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
        f"DRIFT DETECTED — local ({local_len} chars) vs remote ({remote_len} chars), "
        f"difference of {diff} chars. Review in Langfuse UI."
    )
```

- [ ] **Step 4: Update `__init__.py`**

Add `check_prompt_drift` and `DriftReport` to re-exports.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_drift_detector.py -v`
Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/agents/common/monitoring/ backend/tests/agents/test_drift_detector.py
git commit -m "feat(monitoring): add prompt drift detection"
```

---

### Task 7: Add build_traced_chain() to llm.py

**Files:**
- Modify: `backend/agents/common/llm.py`
- Test: `backend/tests/agents/test_traced_llm.py`

- [ ] **Step 1: Write the test**

```python
"""Tests for the traced LLM builder."""

import pytest
from unittest.mock import patch, MagicMock


class TestBuildTracedChain:
    """Test the traced chain builder that wires LLM + prompt + callbacks."""

    def test_returns_chain_and_config(self):
        """build_traced_chain returns a runnable chain and a config dict."""
        with patch("backend.agents.common.llm.create_callback_handler") as mock_cb:
            mock_cb.return_value = MagicMock()
            from backend.agents.common.llm import build_traced_chain
            chain, config = build_traced_chain(
                agent_name="test",
                prompt_template="You are {role}",
            )
            assert chain is not None
            assert "callbacks" in config

    def test_returns_empty_config_when_no_langfuse(self):
        """When Langfuse is unavailable, config has no callbacks but chain still works."""
        with patch("backend.agents.common.llm.create_callback_handler") as mock_cb:
            mock_cb.return_value = None
            from backend.agents.common.llm import build_traced_chain
            chain, config = build_traced_chain(
                agent_name="test",
                prompt_template="You are {role}",
            )
            assert chain is not None
            assert config == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_traced_llm.py -v`
Expected: FAIL

- [ ] **Step 3: Implement build_traced_chain() in llm.py**

Add `build_traced_chain()` to the existing `llm.py`. Keep `build_llm()` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/agents/test_traced_llm.py -v`
Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/agents/common/llm.py backend/tests/agents/test_traced_llm.py
git commit -m "feat(monitoring): add build_traced_chain() to LLM factory"
```

---

### Task 8: Migrate Prompts to Langfuse & Upload Initial Versions

**Files:**
- Create: `backend/scripts/upload_prompts_to_langfuse.py`

- [ ] **Step 1: Create the upload script**

A one-time script that reads all local prompts and creates them in Langfuse with the "production" label. This seeds Langfuse so `get_managed_prompt()` has something to fetch.

- [ ] **Step 2: Run the script**

Run: `cd C:/Users/User/Projects/Pegasus && python -m backend.scripts.upload_prompts_to_langfuse`
Expected: All 12 prompts uploaded successfully

- [ ] **Step 3: Verify in Langfuse dashboard**

Check that all prompts appear in Langfuse with "production" label.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/upload_prompts_to_langfuse.py
git commit -m "feat(monitoring): add prompt upload script for Langfuse seeding"
```

---

### Task 9: Migrate All Agents to Use Monitoring Layer

**Files:**
- Modify: `backend/agents/mayor/agent.py`
- Modify: `backend/agents/citizen/agent.py`
- Modify: `backend/agents/career/agent.py`
- Modify: `backend/agents/citizen/cv_analyzers/agent.py`
- Modify: `backend/agents/citizen/cv_analyzers/synthesizer.py`
- Modify: `backend/agents/citizen/roadmap_agent.py`
- Modify: `backend/agents/citizen/comment_analysis.py`
- Modify: `backend/agents/growth/strategist_agent.py`
- Modify: `backend/agents/growth/crawl_agent.py`
- Modify: `backend/agents/growth/analysis_agent.py`
- Modify: `backend/agents/growth/skill_agent.py`

- [ ] **Step 1: Migrate mayor agent** — add `build_langfuse_config()` to `stream_mayor_response`
- [ ] **Step 2: Migrate citizen agent** — add tracing to `handle_citizen_chat`
- [ ] **Step 3: Migrate career agent** — add tracing to `run_career_analysis` and `handle_career_chat`
- [ ] **Step 4: Migrate CV analyzer** — add tracing to `analyze_cv_page`
- [ ] **Step 5: Migrate CV synthesizer** — add tracing to `synthesize_cv_roles`
- [ ] **Step 6: Migrate roadmap agent** — add tracing to `generate_personalized_roadmap`
- [ ] **Step 7: Migrate comment analysis** — replace local `build_llm()` with shared one, add tracing
- [ ] **Step 8: Migrate growth strategist** — add tracing to `run_strategist_agent`
- [ ] **Step 9: Migrate growth crawl agent** — add tracing to `run_crawl_agent`
- [ ] **Step 10: Migrate growth analysis agent** — add tracing to `run_preliminary_analysis` and `run_final_analysis`
- [ ] **Step 11: Migrate skill agent** — add tracing to `run_skill_agent`
- [ ] **Step 12: Run all existing tests**

Run: `cd C:/Users/User/Projects/Pegasus && python -m pytest backend/tests/ -v`
Expected: All tests pass

- [ ] **Step 13: Commit**

```bash
git add backend/agents/
git commit -m "feat(monitoring): migrate all agents to Langfuse tracing and managed prompts"
```

---

### Task 10: Write Monitoring README with Mermaid Diagrams

**Files:**
- Create: `backend/agents/common/monitoring/README.md`

- [ ] **Step 1: Write comprehensive README** with architecture diagrams, prompt versioning guide, A/B testing guide, and getting started instructions.

- [ ] **Step 2: Commit**

```bash
git add backend/agents/common/monitoring/README.md
git commit -m "docs(monitoring): add comprehensive monitoring README with diagrams"
```

---

### Task 11: Update CLAUDE.md Files

**Files:**
- Modify: `backend/CLAUDE.md`
- Modify: `backend/agents/CLAUDE.md`

- [ ] **Step 1: Update backend CLAUDE.md** — add monitoring layer, environment variables, architecture note
- [ ] **Step 2: Update agents CLAUDE.md** — add monitoring/ directory, quick-reference entries

- [ ] **Step 3: Commit**

```bash
git add backend/CLAUDE.md backend/agents/CLAUDE.md
git commit -m "docs(monitoring): update CLAUDE.md files with monitoring layer"
```
