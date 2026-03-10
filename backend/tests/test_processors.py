"""Unit tests for news, job, housing processors and sentiment rules."""

import pytest

from backend.processors.process_news import (
    generate_article_id,
    parse_news_results,
    deduplicate_articles,
    enrich_article,
)
from backend.processors.process_jobs import detect_source, generate_job_id, extract_skills
from backend.processors.scrape_orchestrators import build_geojson_feature
from backend.processors.process_housing import generate_listing_id, format_price
from backend.core.sentiment_rules import score_sentiment, score_misinfo_risk, build_summary


# ---------------------------------------------------------------------------
# NEWS — generate_article_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_article_id_is_deterministic():
    first = generate_article_id("City gets new park", "https://example.com/park")
    second = generate_article_id("City gets new park", "https://example.com/park")
    assert first == second


@pytest.mark.unit
def test_generate_article_id_differs_for_different_inputs():
    id_a = generate_article_id("Title A", "https://a.com")
    id_b = generate_article_id("Title B", "https://b.com")
    assert id_a != id_b


@pytest.mark.unit
def test_generate_article_id_returns_twelve_char_hex():
    article_id = generate_article_id("Some Title", "https://url.com")
    assert len(article_id) == 12
    assert all(c in "0123456789abcdef" for c in article_id)


# ---------------------------------------------------------------------------
# NEWS — parse_news_results
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_parse_news_results_returns_articles_from_news_key():
    body = {"news": [{"title": "Big Story", "link": "https://example.com/story"}]}
    articles = parse_news_results(body, "general")
    assert len(articles) == 1
    assert articles[0]["title"] == "Big Story"
    assert articles[0]["sourceUrl"] == "https://example.com/story"
    assert articles[0]["category"] == "general"


@pytest.mark.unit
def test_parse_news_results_falls_back_to_organic_key():
    body = {"organic": [{"title": "Organic Story", "link": "https://example.com/organic"}]}
    articles = parse_news_results(body, "general")
    assert len(articles) == 1
    assert articles[0]["title"] == "Organic Story"


@pytest.mark.unit
def test_parse_news_results_skips_item_missing_title():
    body = {"news": [{"link": "https://example.com/notitle"}]}
    articles = parse_news_results(body, "general")
    assert articles == []


@pytest.mark.unit
def test_parse_news_results_skips_item_missing_url():
    body = {"news": [{"title": "No URL Article"}]}
    articles = parse_news_results(body, "general")
    assert articles == []


@pytest.mark.unit
def test_parse_news_results_with_empty_body_returns_empty_list():
    articles = parse_news_results({}, "general")
    assert articles == []


@pytest.mark.unit
def test_parse_news_results_article_has_required_fields():
    body = {"news": [{"title": "T", "link": "https://x.com", "snippet": "S", "source": "Source"}]}
    article = parse_news_results(body, "events")[0]
    required_keys = {"id", "title", "excerpt", "body", "source", "sourceUrl",
                     "imageUrl", "category", "publishedAt", "scrapedAt",
                     "upvotes", "downvotes", "commentCount"}
    assert required_keys.issubset(article.keys())


@pytest.mark.unit
def test_parse_news_results_sets_image_url_to_none_when_absent():
    body = {"news": [{"title": "T", "link": "https://x.com"}]}
    article = parse_news_results(body, "general")[0]
    assert article["imageUrl"] is None


# ---------------------------------------------------------------------------
# NEWS — deduplicate_articles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_deduplicate_articles_removes_duplicate_ids():
    articles = [
        {"id": "abc123", "title": "First"},
        {"id": "abc123", "title": "Duplicate"},
        {"id": "xyz789", "title": "Unique"},
    ]
    result = deduplicate_articles(articles)
    assert len(result) == 2
    assert result[0]["title"] == "First"


@pytest.mark.unit
def test_deduplicate_articles_returns_empty_list_for_empty_input():
    assert deduplicate_articles([]) == []


# ---------------------------------------------------------------------------
# NEWS — enrich_article
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_enrich_article_adds_sentiment_field():
    article = {"title": "New park opens in downtown", "excerpt": ""}
    enriched = enrich_article(article)
    assert "sentiment" in enriched
    assert enriched["sentiment"] in ("positive", "negative", "neutral")


@pytest.mark.unit
def test_enrich_article_adds_misinfo_risk_field():
    article = {"title": "SHOCKING reveal you won't believe!", "excerpt": ""}
    enriched = enrich_article(article)
    assert "misinfoRisk" in enriched
    assert isinstance(enriched["misinfoRisk"], int)


@pytest.mark.unit
def test_enrich_article_adds_summary_field():
    article = {"title": "BREAKING: Bridge collapses", "excerpt": ""}
    enriched = enrich_article(article)
    assert "summary" in enriched
    assert isinstance(enriched["summary"], str)


# ---------------------------------------------------------------------------
# JOBS — detect_source
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.parametrize("record,expected", [
    ({"job_seniority_level": "mid"}, "linkedin"),
    ({"company_url_overview": "https://glassdoor.com/overview"}, "glassdoor"),
    ({"job_title": "Driver"}, "indeed"),
])
def test_detect_source_identifies_board_from_record_shape(record, expected):
    assert detect_source([record]) == expected


@pytest.mark.unit
def test_detect_source_returns_unknown_for_empty_list():
    assert detect_source([]) == "unknown"


# ---------------------------------------------------------------------------
# JOBS — generate_job_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_job_id_is_deterministic():
    job = {"job_title": "Nurse", "company_name": "Baptist Health", "url": "https://jobs.com/1"}
    assert generate_job_id(job) == generate_job_id(job)


@pytest.mark.unit
def test_generate_job_id_returns_twelve_chars():
    job = {"job_title": "Driver", "company_name": "ACME", "url": "https://jobs.com/2"}
    assert len(generate_job_id(job)) == 12


# ---------------------------------------------------------------------------
# JOBS — extract_skills
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_skills_finds_known_keywords():
    description = "Must have forklift certification and CDL license"
    skills = extract_skills(description)
    assert "technical" in skills
    assert "cdl" in skills["technical"]


@pytest.mark.unit
def test_extract_skills_returns_empty_dict_for_empty_description():
    assert extract_skills("") == {}


@pytest.mark.unit
def test_extract_skills_returns_empty_dict_for_none():
    assert extract_skills(None) == {}


# ---------------------------------------------------------------------------
# JOBS — build_geojson_feature
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_build_geojson_feature_returns_valid_geojson():
    job = {"lat": 32.36, "lng": -86.30, "job_title": "Engineer", "_id": "abc123",
           "company_name": "ACME", "_source": "indeed", "_scraped_at": "2026-01-01"}
    feature = build_geojson_feature(job)
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "Point"
    assert feature["geometry"]["coordinates"] == [-86.30, 32.36]
    assert feature["properties"]["title"] == "Engineer"


@pytest.mark.unit
def test_build_geojson_feature_returns_none_when_lat_missing():
    job = {"lng": -86.30, "job_title": "Engineer"}
    assert build_geojson_feature(job) is None


# ---------------------------------------------------------------------------
# HOUSING — generate_listing_id + format_price
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_listing_id_is_deterministic():
    listing = {"address": "123 Main St", "price": "250000"}
    assert generate_listing_id(listing) == generate_listing_id(listing)


@pytest.mark.unit
@pytest.mark.parametrize("price,expected", [
    (250000, "$250,000"),
    ("300,000", "$300,000"),
    ("$175000", "$175,000"),
    (None, ""),
    ("", ""),
])
def test_format_price_converts_to_human_readable_string(price, expected):
    assert format_price(price) == expected


# ---------------------------------------------------------------------------
# SENTIMENT — score_sentiment
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_score_sentiment_returns_positive_for_good_keywords():
    sentiment, score = score_sentiment("City opens new community center", "")
    assert sentiment == "positive"
    assert score > 50


@pytest.mark.unit
def test_score_sentiment_returns_negative_for_crime_keywords():
    sentiment, score = score_sentiment("Shooting near downtown", "victim injured after assault")
    assert sentiment == "negative"
    assert score > 50


@pytest.mark.unit
def test_score_sentiment_returns_neutral_when_no_keywords_match():
    sentiment, score = score_sentiment("City council meeting scheduled", "")
    assert sentiment == "neutral"
    assert score == 30


@pytest.mark.unit
def test_score_sentiment_handles_empty_strings():
    sentiment, score = score_sentiment("", "")
    assert sentiment == "neutral"
    assert score == 30


# ---------------------------------------------------------------------------
# SENTIMENT — score_misinfo_risk
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_score_misinfo_risk_returns_zero_for_plain_title():
    assert score_misinfo_risk("City council approves new budget") == 0


@pytest.mark.unit
def test_score_misinfo_risk_flags_sensational_words():
    risk = score_misinfo_risk("SHOCKING: You won't believe what they found")
    assert risk >= 25


@pytest.mark.unit
def test_score_misinfo_risk_caps_at_one_hundred():
    assert score_misinfo_risk("SHOCKING URGENT ALERT secret conspiracy JUST IN!!") <= 100


@pytest.mark.unit
def test_score_misinfo_risk_handles_empty_string():
    assert score_misinfo_risk("") == 0


# ---------------------------------------------------------------------------
# SENTIMENT — build_summary
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.parametrize("title,expected", [
    ("BREAKING: Bridge opens", "Bridge opens"),
    ("LIVE: Mayor speaks", "Mayor speaks"),
    ("ALERT: Flooding downtown", "Flooding downtown"),
    ("Regular headline here", "Regular headline here"),
])
def test_build_summary_strips_known_prefixes(title, expected):
    assert build_summary(title) == expected
