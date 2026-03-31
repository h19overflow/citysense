"""Tests for the Langfuse prompt registry."""

import pytest
from unittest.mock import patch, MagicMock


class TestGetManagedPrompt:
    """Test prompt fetching with fallback behavior."""

    def test_returns_langfuse_prompt_when_available(self):
        """When Langfuse has the prompt, returns it as a ManagedPrompt."""
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
            assert result.template == "You are a {role}"
            assert result.version == 3
            assert result.is_fallback is False
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
            assert result.is_fallback is True
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
            assert result.is_fallback is True
            _clear_cache()

    def test_caches_prompt_within_ttl(self):
        """Subsequent calls within TTL return cached prompt without API call."""
        mock_prompt = MagicMock()
        mock_prompt.get_langchain_prompt.return_value = "Cached {role}"
        mock_prompt.config = {}
        mock_prompt.version = 1

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
            # First call — hits Langfuse
            get_managed_prompt(name="cached-test", fallback="fallback")
            # Second call — should use cache
            get_managed_prompt(name="cached-test", fallback="fallback")
            # get_prompt should only be called once
            assert mock_client.get_prompt.call_count == 1
            _clear_cache()
