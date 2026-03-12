"""Shared LLM factory for all agents.

Centralizes ChatGoogleGenerativeAI construction so every agent
uses the same pattern and config defaults.
"""

from langchain_google_genai import ChatGoogleGenerativeAI

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
