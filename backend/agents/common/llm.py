"""Shared LLM factory for all agents.

Centralizes ChatGoogleGenerativeAI construction so every agent
uses the same pattern and config defaults.

TRACING INTEGRATION
───────────────────
This module also provides build_traced_chain() which wires together:
  1. An LLM instance (via build_llm)
  2. A Langfuse callback handler (via monitoring layer)
  3. A prompt template (hardcoded or Langfuse-managed)

This is the recommended way to create chains in new code:

    chain, config = build_traced_chain(
        agent_name="mayor",
        prompt_template=MAYOR_PROMPT,
    )
    result = await chain.ainvoke({"input": "..."}, config=config)

The config dict contains the Langfuse callback. If Langfuse is not
configured, config is empty and the chain runs without tracing.
"""

from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.agents.common.monitoring.callback_factory import (
    build_langfuse_config,
    create_callback_handler,
)

DEFAULT_MODEL = "gemini-3.1-flash-lite-preview"
DEFAULT_TEMPERATURE = 0.3
DEFAULT_MAX_TOKENS = 2048


def build_llm(
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    thinking_budget: int = 0,
) -> ChatGoogleGenerativeAI:
    """Build a ChatGoogleGenerativeAI instance with shared defaults.

    thinking_budget=0 disables Gemini's internal reasoning/thinking tokens,
    reducing latency significantly for structured-output tasks.
    """
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        max_output_tokens=max_tokens,
        thinking_budget=thinking_budget,
    )


def build_traced_chain(
    agent_name: str,
    prompt_template: str,
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    structured_output: type | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
    tags: list[str] | None = None,
) -> tuple[Runnable, dict[str, Any]]:
    """Build a LangChain chain with Langfuse tracing pre-wired.

    Returns (chain, config) where config contains the Langfuse callback.
    Pass config to chain.ainvoke() to enable tracing:

        chain, config = build_traced_chain("mayor", MAYOR_PROMPT)
        result = await chain.ainvoke({"input": "..."}, config=config)

    Args:
        agent_name: Name for the trace (appears in Langfuse dashboard).
        prompt_template: System prompt string with {var} placeholders.
        model: Gemini model name.
        temperature: LLM temperature.
        max_tokens: Max output tokens.
        structured_output: Optional Pydantic model for structured output.
        user_id: Optional user ID for trace attribution.
        session_id: Optional session ID for grouping traces.
        tags: Optional tags for filtering in Langfuse.

    Returns:
        Tuple of (chain, config_dict). config may be empty if Langfuse
        is not configured — the chain still works, just without tracing.
    """
    llm = build_llm(model=model, temperature=temperature, max_tokens=max_tokens)

    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_template),
        ("human", "{input}"),
    ])

    # ── Wire structured output if requested ──
    if structured_output is not None:
        chain = prompt | llm.with_structured_output(structured_output)
    else:
        chain = prompt | llm

    # ── Build Langfuse config (empty dict if Langfuse not configured) ──
    config = build_langfuse_config(
        agent_name=agent_name,
        user_id=user_id,
        session_id=session_id,
        tags=tags,
    )

    return chain, config
