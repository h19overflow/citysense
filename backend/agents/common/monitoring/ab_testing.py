"""A/B Testing — weighted prompt variant selection and experiment runner.

WHAT IS PROMPT A/B TESTING?
───────────────────────────
A/B testing lets you compare two (or more) versions of a prompt to see
which performs better. Instead of guessing whether a prompt change is an
improvement, you measure it with real data.

HOW IT WORKS — STEP BY STEP
────────────────────────────
1. CREATE two prompt versions in Langfuse:
     "mayor-chat" v3 → labeled "production" (the current one)
     "mayor-chat" v4 → labeled "candidate"  (the one you're testing)

2. DEFINE weights in your code:
     variants = [
         {"label": "production", "weight": 0.8},   # 80% of traffic
         {"label": "candidate",  "weight": 0.2},   # 20% of traffic
     ]

3. ON EACH REQUEST, select_prompt_variant() picks one based on weights.
   The selected label fetches the right prompt version from Langfuse.
   The trace is tagged with which variant was used.

4. IN THE LANGFUSE DASHBOARD, filter traces by tag and compare:
   - Latency    → is the new prompt slower?
   - Token cost → is it more expensive?
   - Feedback   → do users prefer the responses?
   - Errors     → does it fail more often?

5. WHEN YOU'RE CONFIDENT the candidate is better:
   - Move the "production" label to v4 in Langfuse
   - Remove the A/B test config from code
   - Done! No redeployment needed.

VISUAL FLOW
────────────
    Request arrives
        │
        ▼
    select_prompt_variant("mayor-chat", variants)
        │
        ├─ Roll random number (0.0 – 1.0)
        │
        ├─ 0.0 – 0.8 → "production" selected
        │                  ↓
        │            get_managed_prompt("mayor-chat", label="production")
        │                  ↓
        │            Trace tagged: variant=production
        │
        └─ 0.8 – 1.0 → "candidate" selected
                           ↓
                     get_managed_prompt("mayor-chat", label="candidate")
                           ↓
                     Trace tagged: variant=candidate

WHEN TO USE A/B TESTING
───────────────────────
- You've rewritten a prompt and want to validate it improves quality
- You want to test a cheaper model (e.g., flash-lite vs flash)
- You're adding/removing instructions and want to measure impact

WHEN NOT TO USE IT
──────────────────
- Bug fixes (just fix and deploy)
- Minor wording tweaks with no measurable impact
- Prompts that aren't user-facing (internal classification, etc.)

EXPERIMENT RUNNER (OFFLINE)
───────────────────────────
For offline evaluation (not live traffic), use run_experiment().
This runs a prompt against a Langfuse dataset and records results
for side-by-side comparison. Great for regression testing before
promoting a candidate to production.
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
        >>> # label is "production" ~80% of the time, "candidate" ~20%
        >>> prompt = get_managed_prompt("mayor-chat", fallback=..., label=label)
    """
    if not variants:
        return "production"

    labels = [v["label"] for v in variants]
    weights = [v["weight"] for v in variants]

    # random.choices handles weight normalization internally —
    # weights [0.8, 0.2] and [80, 20] produce the same distribution
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
    1. You create a dataset in Langfuse with input/expected-output pairs.
    2. run_experiment() iterates over each item and calls your task_fn.
    3. Results are recorded in Langfuse for side-by-side comparison.

    This is for OFFLINE evaluation (before deploying), not live A/B testing.
    Use select_prompt_variant() for live traffic splitting.

    Args:
        dataset_name: Name of the dataset in Langfuse.
        experiment_name: Name for this experiment run (e.g., "mayor-v4-test").
        task_fn: Async function(item) → result. Called once per dataset item.
        description: Optional description for the experiment.

    Returns:
        Summary dict with experiment_name and dataset_name.
    """
    client = get_langfuse()
    if client is None:
        logger.warning("Cannot run experiment — Langfuse not configured")
        return {"error": "Langfuse not configured"}

    dataset = client.get_dataset(dataset_name)
    dataset.run_experiment(
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
