"""Tests for search_local_jobs tool in backend/agents/career/tools/job_tools.py."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def _make_job(title: str, company: str, address: str = "") -> MagicMock:
    job = MagicMock()
    job.title = title
    job.company = company
    job.address = address
    return job


@pytest.mark.unit
class TestSearchLocalJobsEmpty:
    @pytest.mark.asyncio
    async def test_returns_no_matching_jobs_message_when_db_is_empty(self):
        """When DB returns no results, the tool returns the standard empty message."""
        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("backend.db.crud.jobs.search_jobs_by_roles_and_skills", new_callable=AsyncMock, return_value=[]) as mock_search,
            patch("backend.db.session.AsyncSessionLocal", return_value=mock_ctx),
        ):
            from backend.agents.career.tools.job_tools import search_local_jobs
            result = await search_local_jobs.ainvoke({"roles": "Data Analyst", "skills": "Python"})

        assert result == "No matching jobs found in local database."
        mock_search.assert_awaited_once()


@pytest.mark.unit
class TestSearchLocalJobsWithResults:
    @pytest.mark.asyncio
    async def test_output_contains_job_title_and_company(self):
        """When DB returns a job, output includes the job title and company name."""
        jobs = [_make_job("Data Analyst", "City Hall", "100 Main St")]
        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("backend.db.crud.jobs.search_jobs_by_roles_and_skills", new_callable=AsyncMock, return_value=jobs),
            patch("backend.db.session.AsyncSessionLocal", return_value=mock_ctx),
        ):
            from backend.agents.career.tools.job_tools import search_local_jobs
            result = await search_local_jobs.ainvoke({"roles": "Data Analyst", "skills": "SQL"})

        assert "Data Analyst" in result
        assert "City Hall" in result

    @pytest.mark.asyncio
    async def test_output_is_capped_at_ten_results(self):
        """Even if DB returns more than 10 jobs, only 10 are included in the output."""
        jobs = [_make_job(f"Job {i}", f"Company {i}") for i in range(15)]
        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("backend.db.crud.jobs.search_jobs_by_roles_and_skills", new_callable=AsyncMock, return_value=jobs),
            patch("backend.db.session.AsyncSessionLocal", return_value=mock_ctx),
        ):
            from backend.agents.career.tools.job_tools import search_local_jobs
            result = await search_local_jobs.ainvoke({"roles": "Engineer", "skills": "Java"})

        # Jobs are listed as "- Job X at Company X"
        job_lines = [line for line in result.splitlines() if line.startswith("- ")]
        assert len(job_lines) == 10

    @pytest.mark.asyncio
    async def test_output_includes_address_when_present(self):
        """Job address is included in the output when it is not empty."""
        jobs = [_make_job("Planner", "Planning Dept", "200 Oak Ave")]
        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("backend.db.crud.jobs.search_jobs_by_roles_and_skills", new_callable=AsyncMock, return_value=jobs),
            patch("backend.db.session.AsyncSessionLocal", return_value=mock_ctx),
        ):
            from backend.agents.career.tools.job_tools import search_local_jobs
            result = await search_local_jobs.ainvoke({"roles": "Planner", "skills": "GIS"})

        assert "200 Oak Ave" in result

    @pytest.mark.asyncio
    async def test_output_uses_montgomery_fallback_when_address_missing(self):
        """When address is empty, the output defaults to 'Montgomery, AL'."""
        jobs = [_make_job("Clerk", "County Office", "")]
        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("backend.db.crud.jobs.search_jobs_by_roles_and_skills", new_callable=AsyncMock, return_value=jobs),
            patch("backend.db.session.AsyncSessionLocal", return_value=mock_ctx),
        ):
            from backend.agents.career.tools.job_tools import search_local_jobs
            result = await search_local_jobs.ainvoke({"roles": "Clerk", "skills": "admin"})

        assert "Montgomery, AL" in result
