"""News scraper — SERP discovery + sentiment enrichment + 3-tier geocoding."""

import json
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
from backend.core.bright_data_client import serp_search, fetch_with_unlocker
from backend.core.payloads import NEWS_QUERIES
from backend.core.sentiment_rules import score_sentiment, score_misinfo_risk, build_summary

logger = logging.getLogger("scraper.news")


class NewsScraper(BaseScraper):
    name = "articles"  # JSON collection key
    output_file = OUTPUT_FILES["news"]
    event_type = "news"
    output_format = "json"

    def fetch(self) -> list[dict]:
        articles = self._discover_articles()
        if articles:
            articles = self._fetch_full_text(articles, max_articles=10)
        return articles

    def process(self, raw_data: list[dict]) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        processed: list[dict] = []

        for item in raw_data:
            title = item.get("title", "")
            url = item.get("sourceUrl") or item.get("link") or item.get("url") or ""
            if not title or not url:
                continue

            article = self._build_article(item, now)
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

    def save(self, records: list[dict]) -> None:
        """Override for news-specific JSON structure."""
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        output = {
            "lastScraped": datetime.now(timezone.utc).isoformat(),
            "totalArticles": len(records),
            "articles": records,
        }
        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        logger.info("[%s] Saved %d articles to %s", self.name, len(records), self.output_file)

    def run(self) -> int:
        """Override to chain comment analysis after news scrape."""
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
                articles = self._parse_serp_results(body, entry["category"])
                all_articles.extend(articles)
            if i < len(NEWS_QUERIES) - 1:
                time.sleep(2)
        return all_articles

    def _parse_serp_results(self, body: dict, category: str) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        news_items = body.get("news") or body.get("organic") or body.get("results") or []
        articles: list[dict] = []

        for item in news_items:
            title = item.get("title", "")
            url = item.get("link") or item.get("url") or ""
            if not title or not url:
                continue
            articles.append({
                "id": self.make_id(title, url),
                "title": title,
                "excerpt": item.get("snippet") or item.get("description") or "",
                "body": "",
                "source": item.get("source", ""),
                "sourceUrl": url,
                "imageUrl": item.get("thumbnail") or item.get("image") or None,
                "category": category,
                "publishedAt": item.get("date") or item.get("age") or "",
                "scrapedAt": now,
                "upvotes": 0,
                "downvotes": 0,
                "commentCount": 0,
            })
        return articles

    def _build_article(self, item: dict, now: str) -> dict:
        """Build article dict from an already-parsed item."""
        if "id" in item:
            return item
        title = item.get("title", "")
        url = item.get("sourceUrl") or item.get("link") or item.get("url") or ""
        return {
            "id": self.make_id(title, url),
            "title": title,
            "excerpt": item.get("excerpt") or item.get("snippet") or "",
            "body": item.get("body", ""),
            "source": item.get("source", ""),
            "sourceUrl": url,
            "imageUrl": item.get("imageUrl") or item.get("thumbnail") or None,
            "category": item.get("category", "general"),
            "publishedAt": item.get("publishedAt") or item.get("date") or "",
            "scrapedAt": now,
            "upvotes": item.get("upvotes", 0),
            "downvotes": item.get("downvotes", 0),
            "commentCount": item.get("commentCount", 0),
        }

    def _fetch_full_text(self, articles: list[dict], max_articles: int = 20) -> list[dict]:
        need_text = [a for a in articles if not a.get("body")][:max_articles]
        for article in need_text:
            url = article.get("sourceUrl", "")
            if not url:
                continue
            content = fetch_with_unlocker(url, as_markdown=True)
            if content:
                article["body"] = content[:2000]
            time.sleep(1)
        return articles

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
        """Chain AI comment analysis after news scrape."""
        try:
            from backend.agents.comment_analysis import run_comment_analysis_pipeline
            run_comment_analysis_pipeline()
        except Exception:
            logger.exception("[%s] Comment analysis failed", self.name)
