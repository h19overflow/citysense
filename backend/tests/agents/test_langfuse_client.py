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
            _reset()
            client = get_langfuse()
            assert client is not None
            _reset()

    def test_returns_none_when_keys_missing(self):
        """When env vars are missing, get_langfuse() returns None."""
        with patch.dict("os.environ", {}, clear=True):
            from backend.agents.common.monitoring.langfuse_client import get_langfuse, _reset
            _reset()
            client = get_langfuse()
            assert client is None
            _reset()

    def test_singleton_returns_same_instance(self):
        """Multiple calls return the same cached instance."""
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
