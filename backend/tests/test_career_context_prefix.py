"""Unit tests for _build_context_prefix in backend/agents/career/agent.py."""

import pytest

from backend.agents.career.agent import _build_context_prefix


@pytest.mark.unit
class TestBuildContextPrefixEmptyContext:
    def test_empty_dict_returns_no_prior_analysis_prefix(self):
        """Empty dict produces the 'No prior career analysis found' prefix."""
        result = _build_context_prefix({})
        assert "[No prior career analysis found]" in result

    def test_empty_dict_instructs_user_to_upload_cv(self):
        """Empty dict response asks citizen to upload their CV."""
        result = _build_context_prefix({})
        assert "CV" in result or "upload" in result.lower()


@pytest.mark.unit
class TestBuildContextPrefixWithJobs:
    def test_jobs_appear_in_prefix_text(self):
        """Job titles and companies from job_opportunities appear in prefix."""
        context = {
            "summary": "Good profile",
            "next_role_target": "Software Engineer",
            "job_opportunities": [
                {"title": "Backend Dev", "company": "Acme Inc", "match_percent": 85},
            ],
            "skill_gaps": [],
            "upskill_resources": [],
        }
        result = _build_context_prefix(context)
        assert "Backend Dev" in result
        assert "Acme Inc" in result

    def test_multiple_jobs_all_appear_in_prefix(self):
        """All job entries are listed in the prefix."""
        context = {
            "summary": "ok",
            "next_role_target": "Analyst",
            "job_opportunities": [
                {"title": "Job A", "company": "Corp A", "match_percent": 70},
                {"title": "Job B", "company": "Corp B", "match_percent": 60},
            ],
            "skill_gaps": [],
            "upskill_resources": [],
        }
        result = _build_context_prefix(context)
        assert "Job A" in result
        assert "Job B" in result


@pytest.mark.unit
class TestBuildContextPrefixMissingKeys:
    def test_missing_job_opportunities_key_falls_back_to_none_found(self):
        """Context without job_opportunities key produces 'None found' fallback."""
        context = {
            "summary": "Partial context",
            "next_role_target": "Manager",
        }
        result = _build_context_prefix(context)
        assert "None found" in result

    def test_empty_job_opportunities_list_falls_back_to_none_found(self):
        """Empty job_opportunities list produces 'None found' fallback."""
        context = {
            "summary": "Partial context",
            "next_role_target": "Manager",
            "job_opportunities": [],
        }
        result = _build_context_prefix(context)
        assert "None found" in result


@pytest.mark.unit
class TestBuildContextPrefixNextRoleTarget:
    def test_next_role_target_appears_in_prefix(self):
        """next_role_target value is included in the prefix text."""
        context = {
            "summary": "Strong developer",
            "next_role_target": "Principal Engineer",
            "job_opportunities": [],
            "skill_gaps": [],
            "upskill_resources": [],
        }
        result = _build_context_prefix(context)
        assert "Principal Engineer" in result

    def test_populated_context_includes_already_complete_header(self):
        """Non-empty context starts with the 'Career analysis already complete' header."""
        context = {
            "summary": "ok",
            "next_role_target": "Director",
            "job_opportunities": [],
            "skill_gaps": [],
            "upskill_resources": [],
        }
        result = _build_context_prefix(context)
        assert "[Career analysis already complete" in result
