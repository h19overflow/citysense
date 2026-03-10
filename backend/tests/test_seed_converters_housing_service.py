"""Unit tests for feature_to_housing_row and service_to_row in seed_converters."""

import pytest

from backend.scripts.seed_converters import feature_to_housing_row, service_to_row

HOUSING_FEATURE = {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [-77.10, 39.01]},
    "properties": {
        "id": "house-1", "address": "456 Oak Ave", "price": "$1,500",
        "bedrooms": 3, "type": "apartment",
    },
}

FULL_SERVICE = {
    "id": "svc-1", "category": "food", "title": "SNAP Benefits",
    "provider": "DHHS", "description": "Food assistance",
    "url": "https://dhhs.gov/snap", "phone": "301-555-0100",
    "eligibility": ["low income"], "income_limits": {"max": 30000},
    "how_to_apply": ["online", "in person"],
    "documents_needed": ["ID", "proof of income"],
}


# --- feature_to_housing_row ---

@pytest.mark.unit
def test_feature_to_housing_row_parses_dollar_comma_price_string() -> None:
    """A price like '$1,500' must be converted to the integer 1500."""
    row = feature_to_housing_row(HOUSING_FEATURE)

    assert row["price"] == 1500


@pytest.mark.unit
def test_feature_to_housing_row_parses_plain_integer_price() -> None:
    """An integer price must be stored as-is."""
    feature = {**HOUSING_FEATURE, "properties": {**HOUSING_FEATURE["properties"], "price": 2000}}
    row = feature_to_housing_row(feature)

    assert row["price"] == 2000


@pytest.mark.unit
def test_feature_to_housing_row_parses_numeric_string_price() -> None:
    """A plain numeric string price must be converted to an integer."""
    feature = {**HOUSING_FEATURE, "properties": {**HOUSING_FEATURE["properties"], "price": "950"}}
    row = feature_to_housing_row(feature)

    assert row["price"] == 950


@pytest.mark.unit
def test_feature_to_housing_row_stores_none_when_price_is_absent() -> None:
    """A missing price key must produce None in the row."""
    props = {k: v for k, v in HOUSING_FEATURE["properties"].items() if k != "price"}
    feature = {**HOUSING_FEATURE, "properties": props}
    row = feature_to_housing_row(feature)

    assert row["price"] is None


@pytest.mark.unit
def test_feature_to_housing_row_stores_none_for_unparseable_price() -> None:
    """A non-numeric price string must fall back to None."""
    feature = {**HOUSING_FEATURE, "properties": {**HOUSING_FEATURE["properties"], "price": "contact us"}}
    row = feature_to_housing_row(feature)

    assert row["price"] is None


@pytest.mark.unit
def test_feature_to_housing_row_maps_coords_and_excludes_promoted_keys() -> None:
    """Coordinates must map correctly and excluded keys must not appear in properties."""
    row = feature_to_housing_row(HOUSING_FEATURE)

    assert row["lat"] == 39.01
    assert row["lng"] == -77.10
    assert "id" not in row["properties"]
    assert "address" not in row["properties"]
    assert "price" not in row["properties"]
    assert row["properties"]["bedrooms"] == 3


@pytest.mark.unit
def test_feature_to_housing_row_returns_none_coords_when_geometry_is_null() -> None:
    """A feature with geometry set to None must produce None for lat and lng."""
    feature = {**HOUSING_FEATURE, "geometry": None}
    row = feature_to_housing_row(feature)

    assert row["lat"] is None
    assert row["lng"] is None


# --- service_to_row ---

@pytest.mark.unit
def test_service_to_row_maps_all_top_level_fields() -> None:
    """All top-level string fields must be lifted into the row correctly."""
    row = service_to_row(FULL_SERVICE)

    assert row["id"] == "svc-1"
    assert row["category"] == "food"
    assert row["title"] == "SNAP Benefits"
    assert row["provider"] == "DHHS"
    assert row["description"] == "Food assistance"
    assert row["url"] == "https://dhhs.gov/snap"
    assert row["phone"] == "301-555-0100"


@pytest.mark.unit
def test_service_to_row_nests_detail_fields_under_details_key() -> None:
    """Eligibility and apply fields must be grouped under the details dict."""
    row = service_to_row(FULL_SERVICE)
    details = row["details"]

    assert details["eligibility"] == ["low income"]
    assert details["income_limits"] == {"max": 30000}
    assert details["how_to_apply"] == ["online", "in person"]
    assert details["documents_needed"] == ["ID", "proof of income"]


@pytest.mark.unit
def test_service_to_row_uses_empty_defaults_for_missing_detail_fields() -> None:
    """Missing detail sub-fields must default to empty list or dict."""
    row = service_to_row({"id": "svc-2"})
    details = row["details"]

    assert details["eligibility"] == []
    assert details["income_limits"] == {}
    assert details["how_to_apply"] == []
    assert details["documents_needed"] == []


@pytest.mark.unit
def test_service_to_row_uses_empty_string_defaults_for_missing_top_level_fields() -> None:
    """Missing optional string fields must default to empty strings."""
    row = service_to_row({"id": "svc-3"})

    assert row["category"] == ""
    assert row["title"] == ""
    assert row["provider"] == ""
    assert row["description"] == ""
    assert row["url"] == ""
    assert row["phone"] == ""
