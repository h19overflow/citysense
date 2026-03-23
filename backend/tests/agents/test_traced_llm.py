"""Tests for the traced LLM builder."""

import pytest
from unittest.mock import patch, MagicMock


class TestBuildTracedChain:
    """Test the traced chain builder that wires LLM + prompt + callbacks."""

    @patch("backend.agents.common.llm.build_llm")
    @patch("backend.agents.common.llm.build_langfuse_config")
    def test_returns_chain_and_config_with_langfuse(self, mock_config, mock_llm):
        """When Langfuse is available, returns chain + config with callbacks."""
        mock_llm.return_value = MagicMock()
        mock_config.return_value = {"callbacks": [MagicMock()]}

        from backend.agents.common.llm import build_traced_chain
        chain, config = build_traced_chain(
            agent_name="test",
            prompt_template="You are {role}",
        )
        assert chain is not None
        assert "callbacks" in config

    @patch("backend.agents.common.llm.build_llm")
    @patch("backend.agents.common.llm.build_langfuse_config")
    def test_returns_empty_config_when_no_langfuse(self, mock_config, mock_llm):
        """When Langfuse is unavailable, config is empty but chain works."""
        mock_llm.return_value = MagicMock()
        mock_config.return_value = {}

        from backend.agents.common.llm import build_traced_chain
        chain, config = build_traced_chain(
            agent_name="test",
            prompt_template="You are {role}",
        )
        assert chain is not None
        assert config == {}

    @patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"})
    def test_build_llm_still_works_unchanged(self):
        """Existing build_llm() still works with no changes."""
        from backend.agents.common.llm import build_llm
        llm = build_llm()
        assert llm is not None
