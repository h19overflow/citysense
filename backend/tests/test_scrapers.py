"""Unit tests for news, job, housing scrapers and sentiment rules."""

import pytest

from backend.core.data_scraping.scrapers.jobs import JobsScraper
from backend.core.data_scraping.scrapers.news import NewsScraper
from backend.core.data_scraping.scrapers.news_helpers import parse_serp_results
from backend.core.data_scraping.scrapers.housing import HousingScraper
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.sentiment_rules import score_sentiment, score_misinfo_risk, build_summary


# ---------------------------------------------------------------------------
# NEWS — make_id (was generate_article_id)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_article_id_is_deterministic():
    first = BaseScraper.make_id("City gets new park", "https://example.com/park")
    second = BaseScraper.make_id("City gets new park", "https://example.com/park")
    assert first == second


@pytest.mark.unit
def test_generate_article_id_differs_for_different_inputs():
    id_a = BaseScraper.make_id("Title A", "https://a.com")
    id_b = BaseScraper.make_id("Title B", "https://b.com")
    assert id_a != id_b


@pytest.mark.unit
def test_generate_article_id_returns_twelve_char_hex():
    article_id = BaseScraper.make_id("Some Title", "https://url.com")
    assert len(article_id) == 12
    assert all(c in "0123456789abcdef" for c in article_id)


# ---------------------------------------------------------------------------
# NEWS — _parse_serp_results
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_parse_news_results_returns_articles_from_news_key():
    scraper = NewsScraper()
    body = {"news": [{"title": "Big Story", "link": "https://example.com/story"}]}
    articles = parse_serp_results(scraper.make_id, body, "general")
    assert len(articles) == 1
    assert articles[0]["title"] == "Big Story"
    assert articles[0]["sourceUrl"] == "https://example.com/story"
    assert articles[0]["category"] == "general"


@pytest.mark.unit
def test_parse_news_results_falls_back_to_organic_key():
    scraper = NewsScraper()
    body = {"organic": [{"title": "Organic Story", "link": "https://example.com/organic"}]}
    articles = parse_serp_results(scraper.make_id, body, "general")
    assert len(articles) == 1
    assert articles[0]["title"] == "Organic Story"


@pytest.mark.unit
def test_parse_news_results_skips_item_missing_title():
    scraper = NewsScraper()
    body = {"news": [{"link": "https://example.com/notitle"}]}
    articles = parse_serp_results(scraper.make_id, body, "general")
    assert articles == []


@pytest.mark.unit
def test_parse_news_results_skips_item_missing_url():
    scraper = NewsScraper()
    body = {"news": [{"title": "No URL Article"}]}
    articles = parse_serp_results(scraper.make_id, body, "general")
    assert articles == []


@pytest.mark.unit
def test_parse_news_results_with_empty_body_returns_empty_list():
    scraper = NewsScraper()
    articles = parse_serp_results(scraper.make_id, {}, "general")
    assert articles == []


@pytest.mark.unit
def test_parse_news_results_article_has_required_fields():
    scraper = NewsScraper()
    body = {"news": [{"title": "T", "link": "https://x.com", "snippet": "S", "source": "Source"}]}
    article = parse_serp_results(scraper.make_id, body, "events")[0]
    required_keys = {"id", "title", "excerpt", "body", "source", "sourceUrl",
                     "imageUrl", "category", "publishedAt", "scrapedAt",
                     "upvotes", "downvotes", "commentCount"}
    assert required_keys.issubset(article.keys())


@pytest.mark.unit
def test_parse_news_results_sets_image_url_to_none_when_absent():
    scraper = NewsScraper()
    body = {"news": [{"title": "T", "link": "https://x.com"}]}
    article = parse_serp_results(scraper.make_id, body, "general")[0]
    assert article["imageUrl"] is None


# ---------------------------------------------------------------------------
# NEWS — deduplicate
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_deduplicate_articles_removes_duplicate_ids():
    scraper = NewsScraper()
    new = [{"id": "abc123", "title": "Updated"}]
    existing = [{"id": "abc123", "title": "Old"}, {"id": "xyz789", "title": "Other"}]
    result = scraper.deduplicate(new, existing)
    assert len(result) == 2
    assert result[0]["title"] == "Updated"
    assert result[1]["title"] == "Other"


@pytest.mark.unit
def test_deduplicate_articles_returns_empty_list_for_empty_input():
    scraper = NewsScraper()
    assert scraper.deduplicate([], []) == []


# ---------------------------------------------------------------------------
# NEWS — _enrich_sentiment
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_enrich_article_adds_sentiment_field():
    scraper = NewsScraper()
    article = {"title": "New park opens in downtown", "excerpt": ""}
    scraper._enrich_sentiment(article)
    assert "sentiment" in article
    assert article["sentiment"] in ("positive", "negative", "neutral")


@pytest.mark.unit
def test_enrich_article_adds_misinfo_risk_field():
    scraper = NewsScraper()
    article = {"title": "SHOCKING reveal you won't believe!", "excerpt": ""}
    scraper._enrich_sentiment(article)
    assert "misinfoRisk" in article
    assert isinstance(article["misinfoRisk"], int)


@pytest.mark.unit
def test_enrich_article_adds_summary_field():
    scraper = NewsScraper()
    article = {"title": "BREAKING: Bridge collapses", "excerpt": ""}
    scraper._enrich_sentiment(article)
    assert "summary" in article
    assert isinstance(article["summary"], str)


# ---------------------------------------------------------------------------
# JOBS — generate_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_job_id_is_deterministic():
    scraper = JobsScraper()
    job = {"job_title": "Nurse", "company_name": "Baptist Health", "url": "https://jobs.com/1"}
    assert scraper.generate_id(job) == scraper.generate_id(job)


@pytest.mark.unit
def test_generate_job_id_returns_twelve_chars():
    scraper = JobsScraper()
    job = {"job_title": "Driver", "company_name": "ACME", "url": "https://jobs.com/2"}
    assert len(scraper.generate_id(job)) == 12


# ---------------------------------------------------------------------------
# JOBS — _extract_skills
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_skills_finds_known_keywords():
    scraper = JobsScraper()
    job = {"description_text": "Must have forklift certification and CDL license"}
    scraper._extract_skills(job)
    assert "technical" in job["skills"]
    assert "cdl" in job["skills"]["technical"]


@pytest.mark.unit
def test_extract_skills_returns_empty_dict_for_empty_description():
    scraper = JobsScraper()
    job = {"description_text": ""}
    scraper._extract_skills(job)
    assert job["skills"] == {}


@pytest.mark.unit
def test_extract_skills_returns_empty_dict_for_none():
    scraper = JobsScraper()
    job = {}
    scraper._extract_skills(job)
    assert job["skills"] == {}


# ---------------------------------------------------------------------------
# JOBS — _build_geojson_feature
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_build_geojson_feature_returns_valid_geojson():
    scraper = JobsScraper()
    job = {"lat": 32.36, "lng": -86.30, "job_title": "Engineer", "_id": "abc123",
           "company_name": "ACME", "_source": "indeed", "_scraped_at": "2026-01-01"}
    feature = scraper._build_geojson_feature(job)
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "Point"
    assert feature["geometry"]["coordinates"] == [-86.30, 32.36]
    assert feature["properties"]["title"] == "Engineer"


@pytest.mark.unit
def test_build_geojson_feature_returns_none_when_lat_missing():
    scraper = JobsScraper()
    job = {"lng": -86.30, "job_title": "Engineer"}
    assert scraper._build_geojson_feature(job) is None


# ---------------------------------------------------------------------------
# HOUSING — generate_id + _format_price
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_listing_id_is_deterministic():
    scraper = HousingScraper()
    listing = {"address": "123 Main St", "price": "250000"}
    assert scraper.generate_id(listing) == scraper.generate_id(listing)


@pytest.mark.unit
@pytest.mark.parametrize("price,expected", [
    (250000, "$250,000"),
    ("300,000", "$300,000"),
    ("$175000", "$175,000"),
    (None, ""),
    ("", ""),
])
def test_format_price_converts_to_human_readable_string(price, expected):
    assert HousingScraper._format_price(price) == expected


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
