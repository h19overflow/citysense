"""Tests for prompt drift detection."""

import pytest
from unittest.mock import patch, MagicMock


class TestCheckPromptDrift:
    """Test drift detection between local and Langfuse prompts."""

    def test_no_drift_when_prompts_match(self):
        """When local and remote prompts are identical, no drift."""
        mock_prompt = MagicMock()
        mock_prompt.get_langchain_prompt.return_value = "Hello {name}"
        mock_prompt.version = 1

        mock_client = MagicMock()
        mock_client.get_prompt.return_value = mock_prompt

        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.is_drifted is False
            assert report.status == "synced"

    def test_drift_detected_when_prompts_differ(self):
        """When local and remote prompts differ, drift is detected."""
        mock_prompt = MagicMock()
        mock_prompt.get_langchain_prompt.return_value = "Updated {name}"
        mock_prompt.version = 2

        mock_client = MagicMock()
        mock_client.get_prompt.return_value = mock_prompt

        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.is_drifted is True
            assert report.status == "drifted"
            assert "DRIFT DETECTED" in report.diff_summary

    def test_returns_unknown_when_langfuse_unavailable(self):
        """When Langfuse is not connected, drift is unknown."""
        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = None
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.status == "unknown"
            assert report.is_drifted is False

    def test_returns_unknown_on_fetch_error(self):
        """When Langfuse fetch fails, drift is unknown."""
        mock_client = MagicMock()
        mock_client.get_prompt.side_effect = Exception("Timeout")

        with patch(
            "backend.agents.common.monitoring.drift_detector.get_langfuse"
        ) as mock_get:
            mock_get.return_value = mock_client
            from backend.agents.common.monitoring.drift_detector import (
                check_prompt_drift,
            )
            report = check_prompt_drift("test", "Hello {name}")
            assert report.status == "unknown"
