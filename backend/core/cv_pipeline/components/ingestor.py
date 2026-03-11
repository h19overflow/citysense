"""Document ingestion via langchain-docling.

Converts PDF/DOCX into a list of chunked Document objects,
preserving page metadata from docling's dl_meta.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from langchain_core.documents import Document

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx"}


def _validate_file(file_path: Path) -> None:
    """Raise ValueError if the file is missing or unsupported."""
    if not file_path.exists():
        raise FileNotFoundError(f"CV file not found: {file_path}")
    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{file_path.suffix}'. "
            f"Accepted: {SUPPORTED_EXTENSIONS}"
        )


def _load_documents_sync(file_path: Path) -> list[Document]:
    """Run the blocking DoclingLoader in a sync context.

    Imports are deferred here to avoid heavy torch/transformers
    load at module import time.
    """
    from langchain_docling.loader import DoclingLoader

    loader = DoclingLoader(
        file_path=[str(file_path)],
        export_type="doc_chunks",
    )
    return loader.load()


async def ingest_cv(file_path: Path) -> list[Document]:
    """Ingest a CV file and return chunked documents.

    Uses DoclingLoader with DOC_CHUNKS export to split the document
    into structural chunks. Each Document carries dl_meta with page
    numbers, bounding boxes, and hierarchy info.

    Args:
        file_path: Path to the CV file (PDF or DOCX).

    Returns:
        List of langchain Document objects (one per chunk).
    """
    _validate_file(file_path)
    logger.info("Ingesting CV: %s", file_path.name)

    documents = await asyncio.to_thread(_load_documents_sync, file_path)

    logger.info(
        "Ingested %d chunks from %s", len(documents), file_path.name
    )
    return documents


async def extract_page_contents(
    documents: list[Document],
) -> dict[int, str]:
    """Group document chunks by page number.

    Reads the dl_meta field from each chunk's metadata and
    concatenates chunk text per page.

    Args:
        documents: Chunks returned by ingest_cv().

    Returns:
        Dict mapping page number (1-based) to concatenated text.
    """
    pages: dict[int, list[str]] = {}

    for doc in documents:
        page_number = _extract_page_number(doc)
        pages.setdefault(page_number, []).append(doc.page_content)

    return {page: "\n\n".join(chunks) for page, chunks in pages.items()}


def _extract_page_number(doc: Document) -> int:
    """Pull the page number from docling metadata, default to 1.

    dl_meta structure: {doc_items: [{prov: [{page_no: int}]}]}
    The first doc_item's first prov entry gives the primary page.
    dl_meta may be a dict or a string repr of a dict.
    """
    dl_meta = doc.metadata.get("dl_meta", {})

    if isinstance(dl_meta, str):
        try:
            import ast
            dl_meta = ast.literal_eval(dl_meta)
        except (ValueError, SyntaxError):
            return 1

    if not isinstance(dl_meta, dict):
        return 1

    doc_items = dl_meta.get("doc_items", [])
    if doc_items and isinstance(doc_items, list):
        first_item = doc_items[0]
        prov_list = first_item.get("prov", [])
        if prov_list and isinstance(prov_list, list):
            page_no = prov_list[0].get("page_no")
            if isinstance(page_no, int):
                return page_no

    return 1
