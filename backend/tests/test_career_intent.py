"""Tests for career agent handle_career_chat behavior and error handling."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage, HumanMessage


@pytest.mark.unit
class TestHandleCareerChatHappyPath:
    @pytest.mark.asyncio
    async def test_returns_structured_response_on_success(self):
        """handle_career_chat returns the structured response dict from the agent."""
        from backend.agents.career.schemas import CareerAgentResponse

        fake_structured = CareerAgentResponse(
            summary="Looking good.",
            job_opportunities=[],
            skill_gaps=[],
            upskill_resources=[],
            next_role_target="Senior Engineer",
            chips=["Tell me more"],
        )
        fake_result = {"structured_response": fake_structured, "messages": []}

        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value=fake_result)

        with patch("backend.agents.career.agent.build_career_agent", return_value=mock_agent):
            from backend.agents.career.agent import handle_career_chat
            result = await handle_career_chat(
                message="What roles should I target?",
                context={"summary": "Strong background", "next_role_target": "Senior Engineer"},
                history=[],
            )

        assert result["next_role_target"] == "Senior Engineer"
        assert result["summary"] == "Looking good."

    @pytest.mark.asyncio
    async def test_agent_ainvoke_is_called_with_messages(self):
        """handle_career_chat passes messages to the agent's ainvoke method."""
        from backend.agents.career.schemas import CareerAgentResponse
        from langchain_core.messages import HumanMessage

        fake_structured = CareerAgentResponse(
            summary="ok",
            job_opportunities=[],
            skill_gaps=[],
            upskill_resources=[],
            next_role_target="",
            chips=[],
        )
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"structured_response": fake_structured})

        with patch("backend.agents.career.agent.build_career_agent", return_value=mock_agent):
            from backend.agents.career.agent import handle_career_chat
            history: list[HumanMessage | AIMessage] = [HumanMessage(content="previous message")]
            await handle_career_chat(message="new question", context={}, history=history)

        call_args = mock_agent.ainvoke.call_args[0][0]
        messages = call_args["messages"]
        assert any(getattr(m, "content", "") == "new question" for m in messages)


@pytest.mark.unit
class TestHandleCareerChatErrorHandling:
    @pytest.mark.asyncio
    async def test_returns_graceful_error_response_on_value_error(self):
        """handle_career_chat returns an error dict when agent raises ValueError."""
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(side_effect=ValueError("LLM failed"))

        with patch("backend.agents.career.agent.build_career_agent", return_value=mock_agent):
            from backend.agents.career.agent import handle_career_chat
            result = await handle_career_chat(
                message="any question",
                context={},
                history=[],
            )

        assert "summary" in result
        assert result["job_opportunities"] == []
        assert result["skill_gaps"] == []

    @pytest.mark.asyncio
    async def test_returns_graceful_error_response_on_runtime_error(self):
        """handle_career_chat returns an error dict when agent raises RuntimeError."""
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(side_effect=RuntimeError("Network timeout"))

        with patch("backend.agents.career.agent.build_career_agent", return_value=mock_agent):
            from backend.agents.career.agent import handle_career_chat
            result = await handle_career_chat(
                message="any question",
                context={},
                history=[],
            )

        assert "try again" in result["summary"].lower()
        assert "chips" in result

    @pytest.mark.asyncio
    async def test_no_tool_calls_needed_when_context_provided(self):
        """handle_career_chat does not call tools when context is already present."""
        from backend.agents.career.schemas import CareerAgentResponse

        fake_structured = CareerAgentResponse(
            summary="done",
            job_opportunities=[],
            skill_gaps=[],
            upskill_resources=[],
            next_role_target="Manager",
            chips=[],
        )
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"structured_response": fake_structured})

        with patch("backend.agents.career.agent.build_career_agent", return_value=mock_agent):
            from backend.agents.career.agent import handle_career_chat
            result = await handle_career_chat(
                message="what next?",
                context={"summary": "good", "next_role_target": "Manager"},
                history=[],
            )

        invoked_messages = mock_agent.ainvoke.call_args[0][0]["messages"]
        context_msg = invoked_messages[0].content
        assert "answer using ONLY the above context" in context_msg
        assert result["next_role_target"] == "Manager"
