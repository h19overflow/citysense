"""Tests for backend/db/crud/cv.py — all DB I/O is mocked."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from backend.db.crud.cv import (
    create_cv_upload,
    create_cv_version,
    delete_cv_upload,
    find_version_by_hash,
    get_cv_upload_with_versions,
    get_latest_cv_version,
    get_next_version_number,
    list_cv_uploads_by_citizen,
    list_cv_versions,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_async_session() -> AsyncMock:
    """Return a minimal AsyncSession mock."""
    session = AsyncMock()
    session.expunge = MagicMock()
    return session


def make_scalar_result(value) -> MagicMock:
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalars.return_value.all.return_value = [value] if value else []
    return result


# ===========================================================================
# create_cv_upload
# ===========================================================================


class TestCreateCvUpload:
    @pytest.mark.unit
    async def test_delegates_to_create_record(self):
        session = make_async_session()
        fake_upload = MagicMock(id="up-1")

        with patch(
            "backend.db.crud.cv.create_record", new_callable=AsyncMock, return_value=fake_upload
        ) as mock_create:
            result = await create_cv_upload(session, citizen_id="c1", file_name="cv.pdf")

        mock_create.assert_awaited_once()
        assert result.id == "up-1"

    @pytest.mark.unit
    async def test_passes_kwargs_through(self):
        session = make_async_session()
        fake_upload = MagicMock()

        with patch("backend.db.crud.cv.create_record", new_callable=AsyncMock, return_value=fake_upload) as mock_create:
            await create_cv_upload(session, citizen_id="c9", file_name="resume.pdf", file_url="s3://bucket/file")

        _, kwargs = mock_create.call_args
        assert kwargs["citizen_id"] == "c9"
        assert kwargs["file_name"] == "resume.pdf"


# ===========================================================================
# get_cv_upload_with_versions
# ===========================================================================


class TestGetCvUploadWithVersions:
    @pytest.mark.unit
    async def test_returns_none_when_not_found(self):
        session = make_async_session()
        session.execute.return_value = make_scalar_result(None)

        result = await get_cv_upload_with_versions(session, "missing-id")
        assert result is None

    @pytest.mark.unit
    async def test_expunges_record_before_returning(self):
        session = make_async_session()
        fake_upload = MagicMock(id="up-2")
        session.execute.return_value = make_scalar_result(fake_upload)

        result = await get_cv_upload_with_versions(session, "up-2")

        session.expunge.assert_called_once_with(fake_upload)
        assert result.id == "up-2"

    @pytest.mark.unit
    async def test_executes_query_against_session(self):
        session = make_async_session()
        session.execute.return_value = make_scalar_result(None)

        await get_cv_upload_with_versions(session, "any-id")

        session.execute.assert_awaited_once()


# ===========================================================================
# list_cv_uploads_by_citizen
# ===========================================================================


class TestListCvUploadsByCitizen:
    @pytest.mark.unit
    async def test_returns_empty_list_when_no_uploads(self):
        session = make_async_session()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        session.execute.return_value = result_mock

        results = await list_cv_uploads_by_citizen(session, "citizen-x")
        assert results == []

    @pytest.mark.unit
    async def test_expunges_every_returned_record(self):
        session = make_async_session()
        r1, r2 = MagicMock(), MagicMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [r1, r2]
        session.execute.return_value = result_mock

        await list_cv_uploads_by_citizen(session, "citizen-y")

        assert session.expunge.call_count == 2

    @pytest.mark.unit
    async def test_returns_list_of_uploads(self):
        session = make_async_session()
        fake_upload = MagicMock(id="up-10")
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_upload]
        session.execute.return_value = result_mock

        uploads = await list_cv_uploads_by_citizen(session, "citizen-z")
        assert len(uploads) == 1
        assert uploads[0].id == "up-10"


# ===========================================================================
# delete_cv_upload
# ===========================================================================


class TestDeleteCvUpload:
    @pytest.mark.unit
    async def test_delegates_to_delete_record(self):
        session = make_async_session()

        with patch(
            "backend.db.crud.cv.delete_record", new_callable=AsyncMock, return_value=True
        ) as mock_delete:
            result = await delete_cv_upload(session, "up-99")

        mock_delete.assert_awaited_once()
        assert result is True

    @pytest.mark.unit
    async def test_returns_false_when_not_found(self):
        session = make_async_session()

        with patch(
            "backend.db.crud.cv.delete_record", new_callable=AsyncMock, return_value=False
        ):
            result = await delete_cv_upload(session, "nonexistent")

        assert result is False


# ===========================================================================
# create_cv_version
# ===========================================================================


class TestCreateCvVersion:
    @pytest.mark.unit
    async def test_delegates_to_create_record(self):
        session = make_async_session()
        fake_version = MagicMock(id="ver-5")

        with patch(
            "backend.db.crud.cv.create_record", new_callable=AsyncMock, return_value=fake_version
        ) as mock_create:
            result = await create_cv_version(session, cv_upload_id="u1", version_number=1)

        mock_create.assert_awaited_once()
        assert result.id == "ver-5"


# ===========================================================================
# get_latest_cv_version
# ===========================================================================


class TestGetLatestCvVersion:
    @pytest.mark.unit
    async def test_returns_none_when_no_versions(self):
        session = make_async_session()
        session.execute.return_value = make_scalar_result(None)

        result = await get_latest_cv_version(session, "upload-x")
        assert result is None

    @pytest.mark.unit
    async def test_expunges_record_when_found(self):
        session = make_async_session()
        fake_version = MagicMock(id="ver-1")
        session.execute.return_value = make_scalar_result(fake_version)

        result = await get_latest_cv_version(session, "upload-y")

        session.expunge.assert_called_once_with(fake_version)
        assert result.id == "ver-1"


# ===========================================================================
# get_next_version_number
# ===========================================================================


class TestGetNextVersionNumber:
    @pytest.mark.unit
    async def test_returns_one_for_first_version(self):
        session = make_async_session()
        scalar_result = MagicMock()
        scalar_result.scalar_one.return_value = 0  # coalesce returns 0 when no rows
        session.execute.return_value = scalar_result

        number = await get_next_version_number(session, "upload-new")
        assert number == 1

    @pytest.mark.unit
    async def test_increments_existing_max(self):
        session = make_async_session()
        scalar_result = MagicMock()
        scalar_result.scalar_one.return_value = 3
        session.execute.return_value = scalar_result

        number = await get_next_version_number(session, "upload-existing")
        assert number == 4

    @pytest.mark.unit
    async def test_executes_query_with_session(self):
        session = make_async_session()
        scalar_result = MagicMock()
        scalar_result.scalar_one.return_value = 0
        session.execute.return_value = scalar_result

        await get_next_version_number(session, "any-upload")

        session.execute.assert_awaited_once()


# ===========================================================================
# find_version_by_hash
# ===========================================================================


class TestFindVersionByHash:
    @pytest.mark.unit
    async def test_returns_none_when_hash_not_found(self):
        session = make_async_session()
        session.execute.return_value = make_scalar_result(None)

        result = await find_version_by_hash(session, "upload-a", "deadbeef" * 8)
        assert result is None

    @pytest.mark.unit
    async def test_returns_and_expunges_matching_version(self):
        session = make_async_session()
        fake_version = MagicMock(id="ver-dup")
        session.execute.return_value = make_scalar_result(fake_version)

        result = await find_version_by_hash(session, "upload-b", "abc123")

        session.expunge.assert_called_once_with(fake_version)
        assert result.id == "ver-dup"


# ===========================================================================
# list_cv_versions
# ===========================================================================


class TestListCvVersions:
    @pytest.mark.unit
    async def test_returns_empty_when_no_versions(self):
        session = make_async_session()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        session.execute.return_value = result_mock

        versions = await list_cv_versions(session, "upload-empty")
        assert versions == []

    @pytest.mark.unit
    async def test_expunges_each_version(self):
        session = make_async_session()
        v1, v2 = MagicMock(), MagicMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [v1, v2]
        session.execute.return_value = result_mock

        await list_cv_versions(session, "upload-multi")

        assert session.expunge.call_count == 2

    @pytest.mark.unit
    async def test_returns_correct_count(self):
        session = make_async_session()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [MagicMock(), MagicMock(), MagicMock()]
        session.execute.return_value = result_mock

        versions = await list_cv_versions(session, "upload-3v")
        assert len(versions) == 3
