"""Document ingestion via PyMuPDF (fitz).

Extracts text per page from PDF and DOCX files.
Returns a list of page dicts compatible with extract_page_contents().
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx"}

# Internal page representation — only used within this module.
type _PageDict = dict[str, int | str]


def _validate_file(file_path: Path) -> None:
    """Raise if the file is missing or unsupported."""
    if not file_path.exists():
        raise FileNotFoundError(f"CV file not found: {file_path}")
    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{file_path.suffix}'. "
            f"Accepted: {SUPPORTED_EXTENSIONS}"
        )


def _extract_pages_sync(file_path: Path) -> list[_PageDict]:
    """Extract text per page using PyMuPDF (blocking — run in thread)."""
    import fitz  # PyMuPDF

    suffix = file_path.suffix.lower()
    pages: list[_PageDict] = []

    if suffix == ".pdf":
        with fitz.open(str(file_path)) as doc:
            for page_index, page in enumerate(doc, start=1):
                text = page.get_text()
                pages.append({"page_no": page_index, "text": text})
    elif suffix == ".docx":
        pages = _extract_docx_pages(file_path)

    return pages


def _extract_docx_pages(file_path: Path) -> list[_PageDict]:
    """Extract text from DOCX, splitting on page breaks where present.

    DOCX has no true page concept — we split on rendered page breaks
    (w:lastRenderedPageBreak / w:pageBreak) and treat the whole document
    as page 1 if no breaks exist.
    """
    from docx import Document as DocxDocument

    doc = DocxDocument(str(file_path))
    current_page = 1
    page_texts: dict[int, list[str]] = {1: []}

    for paragraph in doc.paragraphs:
        for run in paragraph.runs:
            if run._element.xml.find("w:lastRenderedPageBreak") != -1 or \
               run._element.xml.find("w:pageBreak") != -1:
                current_page += 1
                page_texts[current_page] = []
        if paragraph.text.strip():
            page_texts[current_page].append(paragraph.text)

    return [
        {"page_no": page_no, "text": "\n".join(lines)}
        for page_no, lines in page_texts.items()
    ]


async def ingest_cv(file_path: Path) -> list[_PageDict]:
    """Ingest a CV file and return a list of per-page dicts.

    Each dict has keys: page_no (int, 1-based), text (str).

    Args:
        file_path: Path to the CV file (PDF or DOCX).

    Returns:
        List of page dicts, one per page.
    """
    _validate_file(file_path)
    logger.info("Ingesting CV: %s", file_path.name)

    pages = await asyncio.to_thread(_extract_pages_sync, file_path)

    logger.info("Ingested %d pages from %s", len(pages), file_path.name)
    return pages


async def extract_page_contents(pages: list[_PageDict]) -> dict[int, str]:
    """Convert the page list into a page_number → text mapping.

    Args:
        pages: List returned by ingest_cv().

    Returns:
        Dict mapping page number (1-based) to page text.
    """
    return {int(page["page_no"]): str(page["text"]) for page in pages}
