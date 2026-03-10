"""
Rule-based sentiment scoring for Montgomery news articles.

Contains keyword lists, clickbait patterns, and scoring functions
used by enrich_news_sentiment.py to tag each article.
"""

import re

POSITIVE_KEYWORDS: list[str] = [
    "growth", "improve", "invest", "new", "grant", "award",
    "celebrate", "progress", "expand", "success", "open", "launch",
    "revitalize", "develop", "benefit", "opportunity", "community",
    "support", "innovation", "upgrade", "restoration", "partnership",
]

NEGATIVE_KEYWORDS: list[str] = [
    "shooting", "murder", "crime", "arrest", "killed", "dead",
    "crash", "fire", "fraud", "theft", "assault", "robbery",
    "missing", "injured", "victim", "charged", "indicted",
    "violence", "drugs", "closing", "layoff", "shutdown",
]

CLICKBAIT_PATTERNS: list[str] = [
    r"(?i)\b(shocking|unbelievable|you won't believe|exposed|breaking)\b",
    r"(?i)^LIVE:",
    r"(?i)\b(ALERT|URGENT|JUST IN)\b",
    r"(?i)\b(secret|conspiracy|coverup|cover-up)\b",
    r"(?i)!\s*!+",
    r"(?i)\b(they don't want you to know)\b",
]

STRIP_PREFIXES: list[str] = [
    "LIVE:", "BREAKING:", "ALERT:", "JUST IN:", "WATCH:", "UPDATE:",
]


def score_sentiment(title: str, excerpt: str) -> tuple[str, int]:
    """Score article sentiment based on keyword frequency.

    Returns a (label, confidence) tuple where label is one of
    'positive', 'negative', or 'neutral' and confidence is 0-100.
    """
    text = f"{title} {excerpt}".lower()

    positive_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text)
    negative_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text)

    if positive_count > negative_count:
        score = min(100, 50 + (positive_count - negative_count) * 10)
        return ("positive", score)

    if negative_count > positive_count:
        score = min(100, 50 + (negative_count - positive_count) * 10)
        return ("negative", score)

    return ("neutral", 30)


def score_misinfo_risk(title: str) -> int:
    """Score misinformation risk based on clickbait pattern matches.

    Each matching pattern adds 25 points. Returns 0-100.
    """
    total = 0
    for pattern in CLICKBAIT_PATTERNS:
        if re.search(pattern, title):
            total += 25
    return min(100, total)


def build_summary(title: str) -> str:
    """Build a clean summary by stripping known prefixes from the title."""
    cleaned = title
    for prefix in STRIP_PREFIXES:
        if cleaned.upper().startswith(prefix):
            cleaned = cleaned[len(prefix):]
            break
    return cleaned.strip()
