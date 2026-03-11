"""Persist CV analysis results to the database with hash dedup."""

from __future__ import annotations

import hashlib
import json
import logging

from backend.core.cv_pipeline.schemas import CVAnalysisResult
from backend.db.crud.cv import (
    create_cv_version,
    find_version_by_hash,
    get_next_version_number,
)
from backend.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


def compute_result_hash(result: CVAnalysisResult) -> str:
    """SHA-256 of the canonical JSON representation of the result.

    Used to detect duplicate analyses — if the CV content hasn't
    changed, the analysis output will hash identically.
    """
    canonical = json.dumps(
        result.model_dump(mode="json"),
        sort_keys=True,
        ensure_ascii=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


async def persist_cv_result(
    cv_upload_id: str,
    result: CVAnalysisResult,
) -> tuple[str, bool]:
    """Save a CVAnalysisResult as a new version, skipping if duplicate.

    Computes a SHA-256 hash of the result. If a version with the
    same hash already exists for this upload, the insert is skipped.

    Args:
        cv_upload_id: FK to the cv_uploads row.
        result: Aggregated pipeline output.

    Returns:
        Tuple of (version_id, is_new). is_new=False means dedup hit.
    """
    content_hash = compute_result_hash(result)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            existing = await find_version_by_hash(
                session, cv_upload_id, content_hash
            )
            if existing:
                logger.info(
                    "Duplicate analysis detected (hash=%s…), "
                    "skipping version insert for upload %s",
                    content_hash[:12],
                    cv_upload_id,
                )
                return existing.id, False

            version_number = await get_next_version_number(
                session, cv_upload_id
            )
            version = await create_cv_version(
                session,
                cv_upload_id=cv_upload_id,
                version_number=version_number,
                content_hash=content_hash,
                experience=[e.model_dump() for e in result.experience],
                projects=[p.model_dump() for p in result.projects],
                skills=result.skills,
                soft_skills=result.soft_skills,
                tools=result.tools,
                roles=result.roles,
                education=[e.model_dump() for e in result.education],
                summary=result.summary,
                page_count=result.page_count,
            )
            logger.info(
                "Persisted CV version %d (hash=%s…) for upload %s",
                version_number,
                content_hash[:12],
                cv_upload_id,
            )
            return version.id, True
