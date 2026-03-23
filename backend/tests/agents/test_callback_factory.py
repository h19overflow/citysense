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
            mock_get.return_value = MagicMock()
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


class TestBuildLangfuseConfig:
    """Test config dict builder."""

    def test_returns_config_with_callbacks_when_available(self):
        """When Langfuse is connected, config includes callbacks list."""
        with patch(
            "backend.agents.common.monitoring.callback_factory.get_langfuse"
        ) as mock_get:
            mock_get.return_value = MagicMock()
            from backend.agents.common.monitoring.callback_factory import (
                build_langfuse_config,
            )
            config = build_langfuse_config(agent_name="test-agent")
            assert "callbacks" in config
            assert len(config["callbacks"]) == 1

    def test_returns_empty_config_when_unavailable(self):
        """When Langfuse is not connected, returns empty dict."""
        with patch(
            "backend.agents.common.monitoring.callback_factory.get_langfuse"
        ) as mock_get:
            mock_get.return_value = None
            from backend.agents.common.monitoring.callback_factory import (
                build_langfuse_config,
            )
            config = build_langfuse_config(agent_name="test-agent")
            assert config == {}
