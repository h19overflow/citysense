"""Mayor chat agent using LangChain create_agent + Gemini.

Provides a conversational interface for the mayor to query
citizen sentiment data via read-only tools with streaming.
"""

from collections.abc import AsyncIterator

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
from langchain.agents import create_agent

from backend.agents.common.llm import build_llm
from backend.agents.mayor.prompt import MAYOR_CHAT_PROMPT
from backend.agents.mayor.tools.registry import TOOLS

load_dotenv()



_cached_agent = None


def build_mayor_agent() -> object:
    """Return the cached mayor chat agent, building it once on first call."""
    global _cached_agent
    if _cached_agent is not None:
        return _cached_agent
    llm = build_llm()
    _cached_agent = create_agent(
        model=llm,
        tools=TOOLS,
        system_prompt=MAYOR_CHAT_PROMPT,
    )
    return _cached_agent


def format_chat_history(history: list[dict]) -> list[HumanMessage | AIMessage]:
    """Convert frontend chat history dicts to LangChain message objects."""
    messages = []
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    return messages


async def stream_mayor_response(
    user_message: str,
    chat_history: list[dict],
) -> AsyncIterator[tuple[str, str]]:
    """Stream agent response as (event_type, data) tuples.

    Yields:
        ("token", text) for model text output.
        ("tool_call", tool_name) when the agent invokes a tool.
    """
    agent = build_mayor_agent()
    history = format_chat_history(chat_history)
    history.append(HumanMessage(content=user_message))

    async for chunk in agent.astream(
        {"messages": history},
        stream_mode="updates",
    ):
        if "model" in chunk:
            messages = chunk["model"].get("messages", [])
            for msg in messages:
                tool_name = extract_tool_call_name(msg)
                if tool_name:
                    yield ("tool_call", tool_name)
                text = extract_message_text(msg)
                if text:
                    yield ("token", text)


def extract_tool_call_name(msg: AIMessage) -> str | None:
    """Extract tool name from an AIMessage if it contains a function call."""
    kwargs = getattr(msg, "additional_kwargs", {})
    func_call = kwargs.get("function_call", {})
    return func_call.get("name")


def extract_message_text(msg: AIMessage) -> str:
    """Extract plain text from an AIMessage, handling list-of-dicts content."""
    content = getattr(msg, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [p["text"] for p in content if isinstance(p, dict) and p.get("type") == "text"]
        return "".join(parts)
    return ""
