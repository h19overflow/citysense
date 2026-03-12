"""News scraper — SERP discovery + sentiment enrichment + 3-tier geocoding."""

import logging
import time
from datetime import datetime, timezone

from backend.config import OUTPUT_FILES
from backend.core.data_scraping.base import BaseScraper
from backend.core.data_scraping.geo import (
    geocode_serp_maps,
    build_jittered_city_center,
    extract_location_mentions,
)
from backend.core.data_scraping.bright_data_client import serp_search
from backend.core.data_scraping.payloads import NEWS_QUERIES
from backend.core.data_scraping.sentiment_rules import score_sentiment, score_misinfo_risk, build_summary
from backend.core.data_scraping.scrapers.news_helpers import (
    parse_serp_results,
    build_article,
    fetch_full_text,
    article_to_row,
)

logger = logging.getLogger("scraper.news")


class NewsScraper(BaseScraper):
    name = "articles"
    output_file = OUTPUT_FILES["news"]
    event_type = "news"
    output_format = "json"

    def fetch(self) -> list[dict]:
        articles = self._discover_articles()
        if articles:
            articles = fetch_full_text(articles, max_articles=10)
        return articles

    def process(self, raw_data: list[dict]) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        processed: list[dict] = []

        for item in raw_data:
            title = item.get("title", "")
            url = item.get("sourceUrl") or item.get("link") or item.get("url") or ""
            if not title or not url:
                continue

            article = build_article(self.make_id, item, now)
            self._enrich_sentiment(article)
            processed.append(article)

        self._geocode_articles(processed)
        return processed

    def generate_id(self, record: dict) -> str:
        return self.make_id(
            record.get("title", ""),
            record.get("sourceUrl", "") or record.get("link", "") or record.get("url", ""),
        )

    def _collection_key(self) -> str:
        return "articles"

    async def save_to_database(self, records: list[dict]) -> int:
        from backend.db.session import get_session
        from backend.db.crud.news import bulk_upsert_articles

        rows = [article_to_row(r) for r in records]
        async with get_session() as session:
            return await bulk_upsert_articles(session, rows)

    def run(self) -> int:
        count = super().run()
        if count > 0:
            self._run_comment_analysis()
        return count

    # ------------------------------------------------------------------
    # News-specific helpers
    # ------------------------------------------------------------------

    def _discover_articles(self) -> list[dict]:
        all_articles: list[dict] = []
        for i, entry in enumerate(NEWS_QUERIES):
            body = serp_search(entry["query"])
            if body:
                articles = parse_serp_results(self.make_id, body, entry["category"])
                all_articles.extend(articles)
            if i < len(NEWS_QUERIES) - 1:
                time.sleep(2)
        return all_articles

    def _enrich_sentiment(self, article: dict) -> None:
        title = article.get("title", "")
        excerpt = article.get("excerpt", "")
        sentiment, sentiment_score = score_sentiment(title, excerpt)
        article["sentiment"] = sentiment
        article["sentimentScore"] = sentiment_score
        article["misinfoRisk"] = score_misinfo_risk(title)
        article["summary"] = build_summary(title)

    def _geocode_articles(self, articles: list[dict], max_geocode: int = 500) -> None:
        api_calls = 0
        for article in articles:
            if isinstance(article.get("location"), dict) and article["location"].get("lat") is not None:
                continue

            title = article.get("title", "")
            excerpt = article.get("excerpt", "")
            specific_mentions = extract_location_mentions(title, excerpt)

            if specific_mentions and api_calls < max_geocode:
                location = None
                for mention in specific_mentions:
                    if api_calls >= max_geocode:
                        break
                    location = geocode_serp_maps(mention)
                    api_calls += 1
                    if location:
                        break
                    time.sleep(1)
                if location:
                    article["location"] = location
                    continue

            article["location"] = build_jittered_city_center(article.get("id", title))

    def _run_comment_analysis(self) -> None:
        try:
            from backend.agents.citizen.comment_analysis import run_comment_analysis_pipeline
            run_comment_analysis_pipeline()
        except Exception:
            logger.exception("[%s] Comment analysis failed", self.name)
