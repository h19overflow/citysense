"""Tests for CV pipeline: schemas, aggregator, db_persist, job_tracker."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.core.cv_pipeline.schemas import (
    CVAnalysisResult,
    ExperienceEntry,
    JobState,
    JobStatus,
    PageAnalysis,
    PipelineEvent,
    ProjectEntry,
)


# ---------------------------------------------------------------------------
# Helpers / shared fixtures
# ---------------------------------------------------------------------------


def make_experience(role: str = "Engineer", company: str = "Acme") -> ExperienceEntry:
    return ExperienceEntry(role=role, company=company, duration="2020-2023")


def make_page(
    skills: list[str] | None = None,
    soft_skills: list[str] | None = None,
    experience: list[ExperienceEntry] | None = None,
) -> PageAnalysis:
    return PageAnalysis(
        skills=skills or [],
        soft_skills=soft_skills or [],
        experience=experience or [],
    )


# ===========================================================================
# schemas.py
# ===========================================================================


class TestExperienceEntry:
    @pytest.mark.unit
    def test_creates_with_required_role(self):
        entry = ExperienceEntry(role="Data Scientist")
        assert entry.role == "Data Scientist"
        assert entry.company == ""
        assert entry.duration == ""

    @pytest.mark.unit
    def test_all_fields_set_correctly(self):
        entry = ExperienceEntry(
            role="Engineer", company="Acme", duration="2020-2023", description="Built things"
        )
        assert entry.description == "Built things"

    @pytest.mark.unit
    def test_serializes_to_dict(self):
        entry = ExperienceEntry(role="Analyst")
        data = entry.model_dump()
        assert set(data.keys()) == {"role", "company", "duration", "description"}

    @pytest.mark.unit
    def test_missing_role_raises_validation_error(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ExperienceEntry()  # type: ignore[call-arg]


class TestPageAnalysis:
    @pytest.mark.unit
    def test_defaults_to_empty_lists(self):
        page = PageAnalysis()
        assert page.skills == []
        assert page.soft_skills == []
        assert page.experience == []
        assert page.tools == []

    @pytest.mark.unit
    def test_raw_text_defaults_to_empty_string(self):
        page = PageAnalysis()
        assert page.raw_text == ""

    @pytest.mark.unit
    def test_accepts_nested_experience_entries(self):
        entry = make_experience()
        page = PageAnalysis(experience=[entry])
        assert page.experience[0].role == "Engineer"


class TestCVAnalysisResult:
    @pytest.mark.unit
    def test_defaults_are_empty(self):
        result = CVAnalysisResult()
        assert result.skills == []
        assert result.page_count == 0

    @pytest.mark.unit
    def test_page_count_set_explicitly(self):
        result = CVAnalysisResult(page_count=3)
        assert result.page_count == 3

    @pytest.mark.unit
    def test_round_trips_through_json(self):
        entry = make_experience()
        result = CVAnalysisResult(experience=[entry], skills=["Python"], page_count=1)
        json_data = result.model_dump(mode="json")
        restored = CVAnalysisResult.model_validate(json_data)
        assert restored.skills == ["Python"]
        assert restored.experience[0].role == "Engineer"


class TestJobStatus:
    @pytest.mark.unit
    def test_all_expected_statuses_exist(self):
        statuses = {s.value for s in JobStatus}
        assert statuses == {"queued", "ingesting", "analyzing", "aggregating", "completed", "failed"}

    @pytest.mark.unit
    def test_status_is_str_enum(self):
        assert JobStatus.QUEUED == "queued"


class TestPipelineEvent:
    @pytest.mark.unit
    def test_creates_with_required_fields(self):
        event = PipelineEvent(job_id="j1", status=JobStatus.QUEUED, stage="Queued")
        assert event.job_id == "j1"
        assert event.progress_pct == 0

    @pytest.mark.unit
    def test_optional_page_fields_default_to_none(self):
        event = PipelineEvent(job_id="j1", status=JobStatus.INGESTING, stage="Ingesting")
        assert event.page is None
        assert event.total_pages is None

    @pytest.mark.unit
    def test_serializes_status_as_string(self):
        event = PipelineEvent(job_id="j1", status=JobStatus.COMPLETED, stage="Done")
        data = event.model_dump(mode="json")
        assert data["status"] == "completed"

    @pytest.mark.unit
    def test_round_trips_from_dict(self):
        event = PipelineEvent(
            job_id="abc", status=JobStatus.ANALYZING, stage="Analyzing", page=2, total_pages=5
        )
        restored = PipelineEvent.model_validate(event.model_dump(mode="json"))
        assert restored.page == 2
        assert restored.status == JobStatus.ANALYZING


class TestJobState:
    @pytest.mark.unit
    def test_creates_with_required_fields(self):
        state = JobState(
            job_id="j1",
            citizen_id="c1",
            cv_upload_id="u1",
            file_path="/tmp/cv.pdf",
        )
        assert state.status == JobStatus.QUEUED
        assert state.result is None

    @pytest.mark.unit
    def test_serializes_nested_result(self):
        result = CVAnalysisResult(skills=["Python"], page_count=1)
        state = JobState(
            job_id="j1", citizen_id="c1", cv_upload_id="u1",
            file_path="/tmp/cv.pdf", result=result,
        )
        data = state.model_dump(mode="json")
        assert data["result"]["skills"] == ["Python"]

    @pytest.mark.unit
    def test_round_trips_full_state(self):
        state = JobState(
            job_id="j42", citizen_id="c7", cv_upload_id="u9",
            file_path="/a/b.pdf", status=JobStatus.COMPLETED, total_pages=3,
        )
        restored = JobState.model_validate(state.model_dump(mode="json"))
        assert restored.job_id == "j42"
        assert restored.status == JobStatus.COMPLETED


# ===========================================================================
# aggregator.py
# ===========================================================================


class TestMergeItems:
    """Tests for _merge_items (case-insensitive dedup into target dict)."""

    @pytest.mark.unit
    def test_deduplicates_case_insensitively(self):
        from backend.core.cv_pipeline.components.aggregator import _merge_items
        target: dict[str, str] = {}
        _merge_items(target, ["Python", "python", "PYTHON"])
        assert len(target) == 1

    @pytest.mark.unit
    def test_preserves_first_occurrence_casing(self):
        from backend.core.cv_pipeline.components.aggregator import _merge_items
        target: dict[str, str] = {}
        _merge_items(target, ["Python", "PYTHON"])
        assert target["python"] == "Python"

    @pytest.mark.unit
    def test_strips_whitespace_before_dedup(self):
        from backend.core.cv_pipeline.components.aggregator import _merge_items
        target: dict[str, str] = {}
        _merge_items(target, ["  Python  ", "Python"])
        assert len(target) == 1

    @pytest.mark.unit
    def test_empty_list_leaves_target_unchanged(self):
        from backend.core.cv_pipeline.components.aggregator import _merge_items
        target: dict[str, str] = {}
        _merge_items(target, [])
        assert target == {}

    @pytest.mark.unit
    def test_blank_strings_are_excluded(self):
        from backend.core.cv_pipeline.components.aggregator import _merge_items
        target: dict[str, str] = {}
        _merge_items(target, ["", "  "])
        assert target == {}


class TestAggregateSyncDirect:
    """Tests for _aggregate_sync (synchronous inner function)."""

    @pytest.mark.unit
    def test_merges_skills_from_multiple_pages(self):
        from backend.core.cv_pipeline.components.aggregator import _aggregate_sync
        pages = [make_page(skills=["Python"]), make_page(skills=["SQL"])]
        result = _aggregate_sync(pages)
        assert "Python" in result.skills
        assert "SQL" in result.skills

    @pytest.mark.unit
    def test_deduplicates_identical_skills_across_pages(self):
        from backend.core.cv_pipeline.components.aggregator import _aggregate_sync
        # Same exact string on two pages must not duplicate
        pages = [make_page(skills=["Python"]), make_page(skills=["Python"])]
        result = _aggregate_sync(pages)
        assert len(result.skills) == 1

    @pytest.mark.unit
    def test_preserves_all_experience_entries_in_order(self):
        from backend.core.cv_pipeline.components.aggregator import _aggregate_sync
        e1 = make_experience(role="Dev")
        e2 = make_experience(role="Manager")
        pages = [make_page(experience=[e1]), make_page(experience=[e2])]
        result = _aggregate_sync(pages)
        assert result.experience[0].role == "Dev"
        assert result.experience[1].role == "Manager"

    @pytest.mark.unit
    def test_page_count_equals_input_length(self):
        from backend.core.cv_pipeline.components.aggregator import _aggregate_sync
        pages = [make_page(), make_page(), make_page()]
        result = _aggregate_sync(pages)
        assert result.page_count == 3

    @pytest.mark.unit
    def test_empty_pages_returns_empty_result(self):
        from backend.core.cv_pipeline.components.aggregator import _aggregate_sync
        result = _aggregate_sync([])
        assert result.skills == []
        assert result.experience == []
        assert result.page_count == 0

    @pytest.mark.unit
    def test_skills_are_sorted_alphabetically(self):
        from backend.core.cv_pipeline.components.aggregator import _aggregate_sync
        pages = [make_page(skills=["SQL", "AWS", "Python"])]
        result = _aggregate_sync(pages)
        assert result.skills == sorted(result.skills)


class TestAggregatePageResults:
    """Tests for the async public function."""

    @pytest.mark.unit
    async def test_returns_cv_analysis_result(self):
        from backend.core.cv_pipeline.components.aggregator import aggregate_page_results
        pages = [make_page(skills=["Python"])]
        result = await aggregate_page_results(pages)
        assert isinstance(result, CVAnalysisResult)

    @pytest.mark.unit
    async def test_deduplicates_identical_skills_across_pages(self):
        from backend.core.cv_pipeline.components.aggregator import aggregate_page_results
        # Exact same string across two pages must appear only once
        pages = [
            make_page(skills=["JavaScript"]),
            make_page(skills=["JavaScript"]),
        ]
        result = await aggregate_page_results(pages)
        assert len(result.skills) == 1

    @pytest.mark.unit
    async def test_empty_input_returns_empty_result(self):
        from backend.core.cv_pipeline.components.aggregator import aggregate_page_results
        result = await aggregate_page_results([])
        assert result.page_count == 0
        assert result.skills == []


# ===========================================================================
# db_persist.py — compute_result_hash
# ===========================================================================


class TestComputeResultHash:
    @pytest.mark.unit
    def test_produces_64_char_hex_string(self):
        from backend.core.cv_pipeline.db_persist import compute_result_hash
        result = CVAnalysisResult(skills=["Python"], page_count=1)
        h = compute_result_hash(result)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    @pytest.mark.unit
    def test_same_result_produces_same_hash(self):
        from backend.core.cv_pipeline.db_persist import compute_result_hash
        result = CVAnalysisResult(skills=["Python", "SQL"], page_count=2)
        assert compute_result_hash(result) == compute_result_hash(result)

    @pytest.mark.unit
    def test_different_content_produces_different_hash(self):
        from backend.core.cv_pipeline.db_persist import compute_result_hash
        r1 = CVAnalysisResult(skills=["Python"], page_count=1)
        r2 = CVAnalysisResult(skills=["Java"], page_count=1)
        assert compute_result_hash(r1) != compute_result_hash(r2)

    @pytest.mark.unit
    def test_empty_result_produces_stable_hash(self):
        from backend.core.cv_pipeline.db_persist import compute_result_hash
        r1 = CVAnalysisResult()
        r2 = CVAnalysisResult()
        assert compute_result_hash(r1) == compute_result_hash(r2)

    @pytest.mark.unit
    def test_hash_is_deterministic_across_calls(self):
        from backend.core.cv_pipeline.db_persist import compute_result_hash
        result = CVAnalysisResult(
            skills=["SQL", "Python"],
            roles=["Engineer"],
            page_count=3,
        )
        hashes = [compute_result_hash(result) for _ in range(5)]
        assert len(set(hashes)) == 1


class TestPersistCvResult:
    @pytest.mark.unit
    async def test_inserts_new_version_when_no_duplicate(self):
        from backend.core.cv_pipeline.db_persist import persist_cv_result

        mock_version = MagicMock()
        mock_version.id = "ver-001"

        mock_session = AsyncMock()
        mock_session.begin = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=None),
            __aexit__=AsyncMock(return_value=False),
        ))
        mock_session_ctx = AsyncMock(
            __aenter__=AsyncMock(return_value=mock_session),
            __aexit__=AsyncMock(return_value=False),
        )

        result = CVAnalysisResult(skills=["Python"], page_count=1)

        with (
            patch("backend.core.cv_pipeline.db_persist.AsyncSessionLocal", return_value=mock_session_ctx),
            patch("backend.core.cv_pipeline.db_persist.find_version_by_hash", new_callable=AsyncMock, return_value=None),
            patch("backend.core.cv_pipeline.db_persist.get_next_version_number", new_callable=AsyncMock, return_value=1),
            patch("backend.core.cv_pipeline.db_persist.create_cv_version", new_callable=AsyncMock, return_value=mock_version),
        ):
            version_id, is_new = await persist_cv_result("upload-abc", result)

        assert is_new is True
        assert version_id == "ver-001"

    @pytest.mark.unit
    async def test_returns_existing_id_on_duplicate_hash(self):
        from backend.core.cv_pipeline.db_persist import persist_cv_result

        existing = MagicMock()
        existing.id = "ver-existing"

        mock_session = AsyncMock()
        mock_session.begin = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=None),
            __aexit__=AsyncMock(return_value=False),
        ))
        mock_session_ctx = AsyncMock(
            __aenter__=AsyncMock(return_value=mock_session),
            __aexit__=AsyncMock(return_value=False),
        )

        result = CVAnalysisResult(skills=["Python"], page_count=1)

        with (
            patch("backend.core.cv_pipeline.db_persist.AsyncSessionLocal", return_value=mock_session_ctx),
            patch("backend.core.cv_pipeline.db_persist.find_version_by_hash", new_callable=AsyncMock, return_value=existing),
        ):
            version_id, is_new = await persist_cv_result("upload-abc", result)

        assert is_new is False
        assert version_id == "ver-existing"


# ===========================================================================
# job_tracker.py
# ===========================================================================


class TestComputeProgress:
    @pytest.mark.unit
    def test_queued_returns_zero(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        assert compute_progress(JobStatus.QUEUED) == 0

    @pytest.mark.unit
    def test_ingesting_returns_ten(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        assert compute_progress(JobStatus.INGESTING) == 10

    @pytest.mark.unit
    def test_aggregating_returns_ninety(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        assert compute_progress(JobStatus.AGGREGATING) == 90

    @pytest.mark.unit
    def test_completed_returns_hundred(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        assert compute_progress(JobStatus.COMPLETED) == 100

    @pytest.mark.unit
    def test_failed_returns_zero(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        assert compute_progress(JobStatus.FAILED) == 0

    @pytest.mark.unit
    def test_analyzing_halfway_through_pages(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        pct = compute_progress(JobStatus.ANALYZING, analyzed_pages=5, total_pages=10)
        assert pct == 55  # base=20 + (90-20)*0.5

    @pytest.mark.unit
    def test_analyzing_no_pages_returns_base(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        pct = compute_progress(JobStatus.ANALYZING, analyzed_pages=0, total_pages=0)
        assert pct == 20

    @pytest.mark.unit
    def test_analyzing_all_pages_complete(self):
        from backend.core.cv_pipeline.job_tracker import compute_progress
        pct = compute_progress(JobStatus.ANALYZING, analyzed_pages=4, total_pages=4)
        assert pct == 90


class TestSaveAndLoadJobState:
    @pytest.mark.unit
    async def test_save_calls_cache_store(self):
        from backend.core.cv_pipeline import job_tracker

        mock_cache = MagicMock()
        mock_cache.store = MagicMock()

        state = JobState(job_id="j1", citizen_id="c1", cv_upload_id="u1", file_path="/f.pdf")

        with patch.object(job_tracker, "cache", mock_cache):
            await job_tracker.save_job_state(state)

        mock_cache.store.assert_called_once()
        call_kwargs = mock_cache.store.call_args
        assert "cv_job:j1" in call_kwargs.args or call_kwargs.args[0] == "cv_job:j1"

    @pytest.mark.unit
    async def test_load_returns_none_when_cache_miss(self):
        from backend.core.cv_pipeline import job_tracker

        mock_cache = MagicMock()
        mock_cache.fetch = MagicMock(return_value=None)

        with patch.object(job_tracker, "cache", mock_cache):
            result = await job_tracker.load_job_state("missing-job")

        assert result is None

    @pytest.mark.unit
    async def test_load_returns_job_state_on_cache_hit(self):
        from backend.core.cv_pipeline import job_tracker

        state = JobState(job_id="j99", citizen_id="c2", cv_upload_id="u2", file_path="/g.pdf")
        state_dict = state.model_dump(mode="json")

        mock_cache = MagicMock()
        mock_cache.fetch = MagicMock(return_value=state_dict)

        with patch.object(job_tracker, "cache", mock_cache):
            loaded = await job_tracker.load_job_state("j99")

        assert loaded is not None
        assert loaded.job_id == "j99"
        assert loaded.status == JobStatus.QUEUED


class TestPublishEvent:
    @pytest.mark.unit
    async def test_skips_publish_when_redis_unavailable(self):
        from backend.core.cv_pipeline import job_tracker

        mock_cache = MagicMock()
        mock_cache.is_available = MagicMock(return_value=False)

        event = PipelineEvent(job_id="j1", status=JobStatus.INGESTING, stage="Ingesting")

        with patch.object(job_tracker, "cache", mock_cache):
            await job_tracker.publish_event(event)

        mock_cache.is_available.assert_called_once()

    @pytest.mark.unit
    async def test_publishes_json_payload_when_redis_available(self):
        from backend.core.cv_pipeline import job_tracker

        mock_client = MagicMock()
        mock_cache = MagicMock()
        mock_cache.is_available = MagicMock(return_value=True)
        mock_cache._client = mock_client

        event = PipelineEvent(
            job_id="j2", status=JobStatus.ANALYZING, stage="Analyzing", page=1, total_pages=3
        )

        with patch.object(job_tracker, "cache", mock_cache):
            await job_tracker.publish_event(event)

        mock_client.publish.assert_called_once()
        channel, payload_str = mock_client.publish.call_args.args
        assert channel == "cv_progress:j2"
        payload = json.loads(payload_str)
        assert payload["job_id"] == "j2"
        assert payload["status"] == "analyzing"


# ===========================================================================
# synthesizer.py
# ===========================================================================


class TestSynthesizeCvRoles:
    """Tests for the CV role synthesizer (mocked LLM)."""

    @pytest.mark.unit
    async def test_returns_roles_list(self):
        from backend.agents.cv_analyzers.synthesizer import synthesize_cv_roles

        cv = CVAnalysisResult(
            experience=[ExperienceEntry(role="Backend Developer", company="Acme")],
            skills=["Python", "FastAPI"],
            tools=["Docker", "PostgreSQL"],
            page_count=2,
        )

        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = MagicMock(roles=["Backend Developer", "Software Engineer"])

        with patch("backend.agents.cv_analyzers.synthesizer.build_synthesizer_chain", return_value=mock_chain):
            roles = await synthesize_cv_roles(cv)

        assert "Backend Developer" in roles
        assert isinstance(roles, list)

    @pytest.mark.unit
    async def test_returns_empty_list_for_empty_cv(self):
        from backend.agents.cv_analyzers.synthesizer import synthesize_cv_roles

        cv = CVAnalysisResult()

        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = MagicMock(roles=[])

        with patch("backend.agents.cv_analyzers.synthesizer.build_synthesizer_chain", return_value=mock_chain):
            roles = await synthesize_cv_roles(cv)

        assert roles == []

    @pytest.mark.unit
    async def test_does_not_include_project_names_as_roles(self):
        from backend.agents.cv_analyzers.synthesizer import synthesize_cv_roles

        cv = CVAnalysisResult(
            projects=[ProjectEntry(name="Student Helper", description="A tutoring app")],
            skills=["Python"],
            page_count=1,
        )

        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = MagicMock(roles=["Software Developer"])

        with patch("backend.agents.cv_analyzers.synthesizer.build_synthesizer_chain", return_value=mock_chain):
            roles = await synthesize_cv_roles(cv)

        assert "Student Helper" not in roles
