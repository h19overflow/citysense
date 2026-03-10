"""Unit tests for article_to_row and feature_to_job_row in seed_converters."""

from datetime import datetime, timezone

import pytest

from backend.scripts.seed_converters import article_to_row, feature_to_job_row

FULL_ARTICLE = {
    "id": "art-1", "title": "Local News", "excerpt": "Short excerpt",
    "body": "Full body text", "source": "WAMU",
    "sourceUrl": "https://wamu.org/story",
    "imageUrl": "https://img.example.com/pic.jpg",
    "category": "politics", "publishedAt": "2024-06-01T12:00:00",
    "scrapedAt": "2024-06-01T13:00:00",
    "upvotes": 5, "downvotes": 2, "commentCount": 10,
    "sentiment": "positive", "sentimentScore": 0.8, "misinfoRisk": "low",
    "summary": "A summary.", "location": "Montgomery County",
    "reactionCounts": {"like": 3},
}

JOB_FEATURE = {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-77.05, 38.99]},
    "properties": {
        "id": "job-1", "title": "Engineer", "company": "Acme",
        "source": "indeed", "address": "123 Main St",
        "url": "https://jobs.example.com/1",
        "salary": "80000", "remote": True,
    },
}

# --- article_to_row ---

@pytest.mark.unit
def test_article_to_row_maps_all_camel_case_fields_to_snake_case() -> None:
    """All camelCase source keys must appear under their snake_case equivalents."""
    row = article_to_row(FULL_ARTICLE)

    assert row["id"] == "art-1"
    assert row["source_url"] == "https://wamu.org/story"
    assert row["image_url"] == "https://img.example.com/pic.jpg"
    assert row["published_at"] == "2024-06-01T12:00:00"
    assert row["comment_count"] == 10
    assert row["sentiment_score"] == 0.8
    assert row["misinfo_risk"] == "low"
    assert row["reaction_counts"] == {"like": 3}


@pytest.mark.unit
def test_article_to_row_parses_valid_iso_scraped_at_date() -> None:
    """A valid ISO scrapedAt string must be converted to a datetime object."""
    row = article_to_row(FULL_ARTICLE)

    assert isinstance(row["scraped_at"], datetime)
    assert row["scraped_at"] == datetime(2024, 6, 1, 13, 0, 0, tzinfo=timezone.utc)


@pytest.mark.unit
def test_article_to_row_falls_back_to_utc_now_for_invalid_scraped_at() -> None:
    """An invalid scrapedAt value must produce a UTC datetime close to now."""
    before = datetime.now(timezone.utc)
    row = article_to_row({**FULL_ARTICLE, "scrapedAt": "not-a-date"})
    after = datetime.now(timezone.utc)

    result = row["scraped_at"]
    assert result.tzinfo is not None
    assert before <= result <= after


@pytest.mark.unit
def test_article_to_row_falls_back_to_utc_now_when_scraped_at_missing() -> None:
    """A missing scrapedAt key must fall back to a UTC datetime near now."""
    article = {k: v for k, v in FULL_ARTICLE.items() if k != "scrapedAt"}
    before = datetime.now(timezone.utc)
    row = article_to_row(article)
    after = datetime.now(timezone.utc)

    result = row["scraped_at"]
    assert result.tzinfo is not None
    assert before <= result <= after


@pytest.mark.unit
def test_article_to_row_uses_defaults_for_missing_optional_fields() -> None:
    """Missing optional fields must produce the documented default values."""
    row = article_to_row({"id": "art-2"})

    assert row["title"] == ""
    assert row["excerpt"] == ""
    assert row["body"] == ""
    assert row["source"] == ""
    assert row["source_url"] == ""
    assert row["image_url"] is None
    assert row["category"] == "general"
    assert row["published_at"] == ""
    assert row["upvotes"] == 0
    assert row["downvotes"] == 0
    assert row["comment_count"] == 0
    assert row["sentiment"] is None
    assert row["sentiment_score"] is None
    assert row["misinfo_risk"] is None
    assert row["summary"] is None
    assert row["location"] is None
    assert row["reaction_counts"] is None


# --- feature_to_job_row ---

@pytest.mark.unit
def test_feature_to_job_row_extracts_scalar_fields_from_properties() -> None:
    """Core scalar fields must be lifted directly from the feature properties."""
    row = feature_to_job_row(JOB_FEATURE)

    assert row["id"] == "job-1"
    assert row["title"] == "Engineer"
    assert row["company"] == "Acme"
    assert row["source"] == "indeed"
    assert row["address"] == "123 Main St"
    assert row["url"] == "https://jobs.example.com/1"


@pytest.mark.unit
def test_feature_to_job_row_maps_geojson_coords_to_lat_lng() -> None:
    """GeoJSON [lng, lat] coordinate order must be swapped to lat/lng columns."""
    row = feature_to_job_row(JOB_FEATURE)

    assert row["lat"] == 38.99
    assert row["lng"] == -77.05


@pytest.mark.unit
def test_feature_to_job_row_excludes_promoted_keys_from_properties_blob() -> None:
    """Keys promoted to top-level columns must not appear in the properties dict."""
    row = feature_to_job_row(JOB_FEATURE)
    excluded = {"id", "title", "company", "source", "address", "url"}

    assert not (excluded & row["properties"].keys())
    assert row["properties"]["salary"] == "80000"
    assert row["properties"]["remote"] is True


@pytest.mark.unit
def test_feature_to_job_row_returns_none_coords_when_geometry_is_null() -> None:
    """A feature with geometry set to None must produce None for lat and lng."""
    feature = {**JOB_FEATURE, "geometry": None}
    row = feature_to_job_row(feature)

    assert row["lat"] is None
    assert row["lng"] is None


@pytest.mark.unit
@pytest.mark.parametrize("coords", [[], [-77.05]])
def test_feature_to_job_row_handles_partial_coordinates(coords: list) -> None:
    """Partial or empty coordinates must not crash and should yield None for missing axis."""
    feature = {**JOB_FEATURE, "geometry": {"type": "Point", "coordinates": coords}}
    row = feature_to_job_row(feature)

    assert row["lat"] is None
