"""Regex-based PII stripping for citizen comments.

Strips phone numbers, emails, and street addresses before
sending comment text to the LLM for analysis.
"""

import re

_PHONE_PATTERN = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
_EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_ADDRESS_PATTERN = re.compile(
    r"\b\d+\s+\w+(?:\s+\w+)?\s+(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Cir|Loop|Pkwy)\b",
    re.IGNORECASE,
)


def redact_comment_text(text: str) -> str:
    """Remove PII patterns from a comment string."""
    result = _PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
    result = _EMAIL_PATTERN.sub("[REDACTED_EMAIL]", result)
    result = _ADDRESS_PATTERN.sub("[REDACTED_ADDRESS]", result)
    return result
