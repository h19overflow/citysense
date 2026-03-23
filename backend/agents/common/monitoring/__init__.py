"""Monitoring layer — Langfuse observability for all agents.

ARCHITECTURE
────────────
This module provides a clean abstraction between our agents and Langfuse.
No agent imports Langfuse directly — everything goes through this layer.

    ┌─────────────────────────────────────────────────┐
    │                  Agent Layer                     │
    │  (mayor, citizen, career, growth, cv, roadmap)   │
    └──────────────────────┬──────────────────────────┘
                           │ uses
    ┌──────────────────────▼──────────────────────────┐
    │              Monitoring Layer (this module)       │
    │                                                  │
    │  langfuse_client    → singleton connection        │
    │  callback_factory   → trace-aware callbacks       │
    │  prompt_registry    → versioned prompt management  │
    │  ab_testing         → weighted variant selection   │
    │  drift_detector     → prompt drift detection       │
    └──────────────────────┬──────────────────────────┘
                           │ calls
    ┌──────────────────────▼──────────────────────────┐
    │              Langfuse Cloud                       │
    └─────────────────────────────────────────────────┘

USAGE
─────
    from backend.agents.common.monitoring import (
        build_langfuse_config,      # Create config dict for chain.ainvoke()
        get_managed_prompt,         # Fetch versioned prompt with fallback
        select_prompt_variant,      # A/B test between prompt versions
        check_prompt_drift,         # Detect local vs remote drift
    )
"""

from backend.agents.common.monitoring.langfuse_client import get_langfuse
from backend.agents.common.monitoring.callback_factory import (
    build_langfuse_config,
    create_callback_handler,
    langfuse_trace_context,
)
from backend.agents.common.monitoring.prompt_registry import (
    get_managed_prompt,
    ManagedPrompt,
)
from backend.agents.common.monitoring.ab_testing import (
    run_experiment,
    select_prompt_variant,
)
from backend.agents.common.monitoring.drift_detector import (
    check_prompt_drift,
    DriftReport,
)

__all__ = [
    "get_langfuse",
    "build_langfuse_config",
    "create_callback_handler",
    "langfuse_trace_context",
    "get_managed_prompt",
    "ManagedPrompt",
    "select_prompt_variant",
    "run_experiment",
    "check_prompt_drift",
    "DriftReport",
]
