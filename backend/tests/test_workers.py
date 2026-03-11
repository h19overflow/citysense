"""Tests for the Celery worker layer.

Covers: celery_app.py configuration, cv_analysis task, cv_pipeline worker,
and lifespan infrastructure verification helpers.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.core.cv_pipeline.schemas import JobState, JobStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_job_state(
    job_id: str = "job-123",
    citizen_id: str = "citizen-1",
    cv_upload_id: str = "upload-1",
    file_path: str = "/tmp/cv.pdf",
    status: JobStatus = JobStatus.QUEUED,
) -> JobState:
    return JobState(
        job_id=job_id,
        citizen_id=citizen_id,
        cv_upload_id=cv_upload_id,
        file_path=file_path,
        status=status,
    )


# ===========================================================================
# celery_app.py — configuration contract
# ===========================================================================


class TestCeleryAppConfiguration:
    @pytest.mark.unit
    def test_app_name_is_citysense_workers(self):
        from backend.workers.celery_app import app

        assert app.main == "citysense_workers"

    @pytest.mark.unit
    def test_task_serializer_is_json(self):
        from backend.workers.celery_app import app

        assert app.conf.task_serializer == "json"

    @pytest.mark.unit
    def test_task_acks_late_is_true(self):
        from backend.workers.celery_app import app

        assert app.conf.task_acks_late is True

    @pytest.mark.unit
    def test_result_serializer_is_json(self):
        from backend.workers.celery_app import app

        assert app.conf.result_serializer == "json"

    @pytest.mark.unit
    def test_accept_content_includes_json(self):
        from backend.workers.celery_app import app

        assert "json" in app.conf.accept_content

    @pytest.mark.contract
    def test_autodiscover_includes_backend_workers_tasks(self):
        """Task packages list must contain the cv_analysis module path."""
        from backend.workers import celery_app as module

        # Re-read source to confirm autodiscover call
        import inspect
        source = inspect.getsource(module)
        assert "backend.workers.tasks" in source


# ===========================================================================
# cv_analysis.py — run_cv_analysis task
# ===========================================================================


class TestRunCvAnalysisTask:
    @pytest.mark.unit
    def test_task_name_is_cv_analysis_run(self):
        from backend.workers.tasks.cv_analysis import run_cv_analysis

        assert run_cv_analysis.name == "cv_analysis.run"

    @pytest.mark.unit
    def test_task_max_retries_is_two(self):
        from backend.workers.tasks.cv_analysis import run_cv_analysis

        assert run_cv_analysis.max_retries == 2

    @pytest.mark.unit
    def test_valid_job_state_dict_calls_execute_pipeline(self):
        """A valid JobState dict triggers _execute_pipeline and returns a dict."""
        from backend.workers.tasks import cv_analysis as cv_module

        job = make_job_state(status=JobStatus.COMPLETED)
        completed_state = make_job_state(status=JobStatus.COMPLETED)

        async def fake_execute(j):
            return completed_state

        with patch.object(cv_module, "_execute_pipeline", fake_execute):
            result = cv_module.run_cv_analysis.run(job.model_dump(mode="json"))

        assert isinstance(result, dict)
        assert result["job_id"] == "job-123"
        assert result["status"] == "completed"

    @pytest.mark.negative
    def test_invalid_dict_raises_validation_error_without_retry(self):
        """A dict missing required fields raises Pydantic ValidationError, not a retry."""
        from pydantic import ValidationError
        from backend.workers.tasks import cv_analysis as cv_module

        with (
            patch.object(cv_module.run_cv_analysis, "retry") as mock_retry,
            pytest.raises(ValidationError),
        ):
            cv_module.run_cv_analysis.run({"job_id": "j1"})  # missing required fields

        mock_retry.assert_not_called()

    @pytest.mark.negative
    def test_non_retryable_failure_propagates_without_retry(self):
        """RuntimeError (not in RETRYABLE_EXCEPTIONS) propagates directly."""
        from backend.workers.tasks import cv_analysis as cv_module

        job = make_job_state()

        async def non_retryable_execute(j):
            raise ValueError("bad data")

        with (
            patch.object(cv_module, "_execute_pipeline", non_retryable_execute),
            patch.object(cv_module.run_cv_analysis, "retry") as mock_retry,
            pytest.raises(ValueError, match="bad data"),
        ):
            cv_module.run_cv_analysis.run(job.model_dump(mode="json"))

        mock_retry.assert_not_called()

    @pytest.mark.unit
    def test_retryable_pipeline_failure_triggers_retry(self):
        """When _execute_pipeline raises a retryable error, the task calls self.retry."""
        from backend.workers.tasks import cv_analysis as cv_module

        job = make_job_state()
        sentinel_retry = Exception("retrying now")

        async def connection_failing_execute(j):
            raise ConnectionError("broker unavailable")

        with (
            patch.object(cv_module, "_execute_pipeline", connection_failing_execute),
            patch.object(
                cv_module.run_cv_analysis,
                "retry",
                side_effect=sentinel_retry,
            ) as mock_retry,
            pytest.raises(Exception, match="retrying now"),
        ):
            cv_module.run_cv_analysis.run(job.model_dump(mode="json"))

        mock_retry.assert_called_once()

    @pytest.mark.edge
    def test_empty_dict_raises_validation_error(self):
        from pydantic import ValidationError
        from backend.workers.tasks import cv_analysis as cv_module

        with pytest.raises(ValidationError):
            cv_module.run_cv_analysis.run({})


# ===========================================================================
# cv_analysis.py — _execute_pipeline helper
# ===========================================================================


class TestExecutePipeline:
    @pytest.mark.unit
    async def test_saves_job_state_before_running_pipeline(self):
        """_execute_pipeline must persist state then drain the pipeline."""
        from backend.workers.tasks.cv_analysis import _execute_pipeline

        job = make_job_state()

        async def fake_pipeline(j):
            return
            yield  # make it an async generator

        mock_save = AsyncMock()
        with (
            patch("backend.core.cv_pipeline.job_tracker.save_job_state", mock_save),
            patch("backend.core.cv_pipeline.pipeline.run_cv_pipeline", fake_pipeline),
        ):
            result = await _execute_pipeline(job)

        mock_save.assert_awaited_once_with(job)
        assert result is job

    @pytest.mark.unit
    async def test_drains_all_pipeline_events(self):
        """All yielded events must be consumed (not just first)."""
        from backend.workers.tasks.cv_analysis import _execute_pipeline
        from backend.core.cv_pipeline.schemas import PipelineEvent

        job = make_job_state()
        events_consumed = []

        async def counting_pipeline(j):
            for stage in ("Ingesting", "Analyzing", "Aggregating"):
                event = PipelineEvent(job_id=j.job_id, status=JobStatus.INGESTING, stage=stage)
                events_consumed.append(stage)
                yield event

        mock_save = AsyncMock()
        with (
            patch("backend.core.cv_pipeline.job_tracker.save_job_state", mock_save),
            patch("backend.core.cv_pipeline.pipeline.run_cv_pipeline", counting_pipeline),
        ):
            await _execute_pipeline(job)

        assert len(events_consumed) == 3


# ===========================================================================
# worker.py — create_job and submit_job
# ===========================================================================


class TestCreateJob:
    @pytest.mark.unit
    def test_returns_job_state_with_queued_status(self):
        from backend.core.cv_pipeline.worker import create_job

        job = create_job("citizen-abc", "upload-xyz", "/tmp/cv.pdf")

        assert isinstance(job, JobState)
        assert job.status == JobStatus.QUEUED

    @pytest.mark.unit
    def test_job_id_is_a_valid_uuid_string(self):
        import uuid
        from backend.core.cv_pipeline.worker import create_job

        job = create_job("citizen-abc", "upload-xyz", "/tmp/cv.pdf")

        parsed = uuid.UUID(job.job_id)
        assert str(parsed) == job.job_id

    @pytest.mark.unit
    def test_fields_are_set_from_arguments(self):
        from backend.core.cv_pipeline.worker import create_job

        job = create_job("cit-1", "upl-1", "/docs/resume.pdf")

        assert job.citizen_id == "cit-1"
        assert job.cv_upload_id == "upl-1"
        assert job.file_path == "/docs/resume.pdf"

    @pytest.mark.unit
    def test_each_call_produces_unique_job_id(self):
        from backend.core.cv_pipeline.worker import create_job

        ids = {create_job("c", "u", "/f.pdf").job_id for _ in range(10)}
        assert len(ids) == 10

    @pytest.mark.edge
    def test_empty_file_path_is_accepted(self):
        """create_job does not validate path existence — empty string is allowed."""
        from backend.core.cv_pipeline.worker import create_job

        job = create_job("c", "u", "")
        assert job.file_path == ""


class TestSubmitJob:
    @pytest.mark.unit
    async def test_saves_job_state_before_dispatching(self):
        from backend.core.cv_pipeline import worker as worker_module

        job = make_job_state()
        mock_task_result = MagicMock()
        mock_task_result.id = "celery-task-abc"

        mock_save = AsyncMock()
        mock_celery_task = MagicMock()
        mock_celery_task.delay.return_value = mock_task_result

        with (
            patch.object(worker_module, "save_job_state", mock_save),
            patch("backend.workers.tasks.cv_analysis.run_cv_analysis", mock_celery_task),
        ):
            await worker_module.submit_job(job)

        mock_save.assert_awaited_once_with(job)

    @pytest.mark.unit
    async def test_returns_celery_task_id(self):
        from backend.core.cv_pipeline import worker as worker_module

        job = make_job_state()
        mock_task_result = MagicMock()
        mock_task_result.id = "celery-task-xyz"

        mock_save = AsyncMock()
        mock_celery_task = MagicMock()
        mock_celery_task.delay.return_value = mock_task_result

        with (
            patch.object(worker_module, "save_job_state", mock_save),
            patch("backend.workers.tasks.cv_analysis.run_cv_analysis", mock_celery_task),
        ):
            task_id = await worker_module.submit_job(job)

        assert task_id == "celery-task-xyz"

    @pytest.mark.unit
    async def test_dispatches_job_as_serialized_dict(self):
        """run_cv_analysis.delay must receive the job serialized as a plain dict."""
        from backend.core.cv_pipeline import worker as worker_module

        job = make_job_state(job_id="dispatch-test")
        mock_task_result = MagicMock()
        mock_task_result.id = "t1"

        mock_save = AsyncMock()
        mock_celery_task = MagicMock()
        mock_celery_task.delay.return_value = mock_task_result

        with (
            patch.object(worker_module, "save_job_state", mock_save),
            patch("backend.workers.tasks.cv_analysis.run_cv_analysis", mock_celery_task),
        ):
            await worker_module.submit_job(job)

        dispatched_payload = mock_celery_task.delay.call_args.args[0]
        assert isinstance(dispatched_payload, dict)
        assert dispatched_payload["job_id"] == "dispatch-test"


# ===========================================================================
# lifespan.py — infrastructure verification helpers
# ===========================================================================


class TestVerifyRedisConnection:
    @pytest.mark.unit
    def test_logs_info_when_redis_is_available(self):
        from backend.api.lifespan import _verify_redis_connection

        mock_cache = MagicMock()
        mock_cache.is_available.return_value = True

        with (
            patch("backend.core.redis_client.cache", mock_cache),
            patch("backend.api.lifespan.logger") as mock_logger,
        ):
            _verify_redis_connection()

        mock_logger.info.assert_called_once()
        assert "Redis" in mock_logger.info.call_args.args[0]

    @pytest.mark.unit
    def test_logs_warning_when_redis_is_unavailable(self):
        from backend.api.lifespan import _verify_redis_connection

        mock_cache = MagicMock()
        mock_cache.is_available.return_value = False

        with (
            patch("backend.core.redis_client.cache", mock_cache),
            patch("backend.api.lifespan.logger") as mock_logger,
        ):
            _verify_redis_connection()

        mock_logger.warning.assert_called_once()
        assert "Redis" in mock_logger.warning.call_args.args[0]

    @pytest.mark.negative
    def test_does_not_raise_when_redis_is_unavailable(self):
        from backend.api.lifespan import _verify_redis_connection

        mock_cache = MagicMock()
        mock_cache.is_available.return_value = False

        with patch("backend.core.redis_client.cache", mock_cache):
            _verify_redis_connection()  # must not raise


class TestVerifyCeleryBroker:
    @pytest.mark.unit
    def test_logs_info_when_broker_is_reachable(self):
        from backend.api.lifespan import _verify_celery_broker

        mock_conn = MagicMock()
        mock_app = MagicMock()
        mock_app.connection.return_value = mock_conn

        with (
            patch("backend.api.lifespan.logger") as mock_logger,
            patch("backend.api.lifespan.app", mock_app, create=True),
        ):
            with patch("backend.workers.celery_app.app", mock_app):
                _verify_celery_broker()

        mock_conn.ensure_connection.assert_called_once()
        mock_conn.close.assert_called_once()

    @pytest.mark.negative
    def test_logs_warning_when_broker_is_unreachable(self):
        from backend.api.lifespan import _verify_celery_broker

        mock_conn = MagicMock()
        mock_conn.ensure_connection.side_effect = ConnectionError("broker down")
        mock_app = MagicMock()
        mock_app.connection.return_value = mock_conn

        with (
            patch("backend.workers.celery_app.app", mock_app),
            patch("backend.api.lifespan.logger") as mock_logger,
        ):
            _verify_celery_broker()

        mock_logger.warning.assert_called_once()

    @pytest.mark.negative
    def test_does_not_raise_when_broker_is_unreachable(self):
        from backend.api.lifespan import _verify_celery_broker

        mock_conn = MagicMock()
        mock_conn.ensure_connection.side_effect = OSError("timeout")
        mock_app = MagicMock()
        mock_app.connection.return_value = mock_conn

        with patch("backend.workers.celery_app.app", mock_app):
            _verify_celery_broker()  # must not raise


# ===========================================================================
# lifespan.py — _start_scraper_if_enabled
# ===========================================================================


class TestStartScraperIfEnabled:
    @pytest.mark.unit
    def test_returns_none_when_auto_scrape_is_zero(self):
        from backend.api.lifespan import _start_scraper_if_enabled

        with patch.dict("os.environ", {"AUTO_SCRAPE": "0"}, clear=False):
            result = _start_scraper_if_enabled()

        assert result is None

    @pytest.mark.unit
    def test_returns_none_when_auto_scrape_unset(self):
        from backend.api.lifespan import _start_scraper_if_enabled

        env = {"AUTO_SCRAPE": "0", "BRIGHTDATA_API_KEY": ""}
        with patch.dict("os.environ", env, clear=False):
            result = _start_scraper_if_enabled()

        assert result is None

    @pytest.mark.unit
    def test_returns_none_when_api_key_missing(self):
        from backend.api.lifespan import _start_scraper_if_enabled

        env = {"AUTO_SCRAPE": "1"}
        with patch.dict("os.environ", env, clear=False):
            # Remove BRIGHTDATA_API_KEY if present
            import os
            os.environ.pop("BRIGHTDATA_API_KEY", None)
            result = _start_scraper_if_enabled()

        assert result is None

    @pytest.mark.unit
    def test_returns_asyncio_task_when_enabled_and_api_key_set(self):
        """When AUTO_SCRAPE=1 and API key present, returns a running asyncio.Task."""
        from backend.api.lifespan import _start_scraper_if_enabled

        env = {"AUTO_SCRAPE": "1", "BRIGHTDATA_API_KEY": "test-key"}
        mock_task = MagicMock(spec=asyncio.Task)
        # A sentinel non-coroutine object to pass to asyncio.create_task (also mocked)
        sentinel_coro = object()

        with (
            patch.dict("os.environ", env, clear=False),
            patch(
                "backend.core.data_scraping.scheduler.start_scheduled_scraping",
                new=MagicMock(return_value=sentinel_coro),
            ),
            patch("asyncio.create_task", return_value=mock_task),
        ):
            result = _start_scraper_if_enabled()

        assert result is mock_task
