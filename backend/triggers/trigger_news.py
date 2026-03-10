"""Trigger Montgomery news scraping via SERP API + Web Unlocker.

Step 1: SERP API discovers article URLs + snippets from Google News
Step 2: Web Unlocker fetches full article text as markdown
Step 3: Geocode new articles via Google Maps SERP

Usage:
    python -m scripts.triggers.trigger_news --poll
    python -m scripts.triggers.trigger_news --poll --skip-fulltext
    python -m scripts.triggers.trigger_news --poll --skip-geocode
"""

import argparse
import time
from datetime import datetime

from backend.core.payloads import NEWS_QUERIES
from backend.core.bright_data_client import serp_search, fetch_with_unlocker
from backend.processors.process_news import (
    parse_news_results, enrich_article, deduplicate_articles,
    load_existing_articles, save_news_articles,
)
from backend.processors.geocode_news import geocode_articles


def discover_articles() -> list[dict]:
    """Step 1: Run all SERP queries to discover news articles."""
    all_articles: list[dict] = []

    for i, entry in enumerate(NEWS_QUERIES):
        query = entry["query"]
        category = entry["category"]

        print(f"\n[{i+1}/{len(NEWS_QUERIES)}] SERP: \"{query}\" ({category})")
        body = serp_search(query)

        if body:
            articles = parse_news_results(body, category)
            print(f"  Found {len(articles)} articles")
            all_articles.extend(articles)
        else:
            print("  No results")

        if i < len(NEWS_QUERIES) - 1:
            time.sleep(2)

    return all_articles


def fetch_full_article_text(articles: list[dict], max_articles: int = 20) -> list[dict]:
    """Step 2: Fetch full text for top articles via Web Unlocker."""
    need_text = [a for a in articles if not a.get("body")][:max_articles]
    print(f"\nFetching full text for {len(need_text)} articles via Web Unlocker...")

    for i, article in enumerate(need_text):
        url = article.get("sourceUrl", "")
        if not url:
            continue

        print(f"  [{i+1}/{len(need_text)}] {article['title'][:50]}...")
        content = fetch_with_unlocker(url, as_markdown=True)

        if content:
            article["body"] = content[:2000]
            print(f"    Got {len(content)} chars")
        else:
            print("    Failed — keeping snippet only")

        time.sleep(1)

    return articles


def run_news_pipeline(skip_fulltext: bool = False, skip_geocode: bool = False) -> None:
    """Run the full news discovery + enrichment pipeline."""
    print(f"{'=' * 60}")
    print(f"NEWS SCRAPER — {datetime.now().isoformat()}")
    print(f"{'=' * 60}")

    articles = discover_articles()

    if not skip_fulltext and articles:
        articles = fetch_full_article_text(articles)

    for article in articles:
        enrich_article(article)

    if not skip_geocode and articles:
        print("\nGeocoding articles...")
        articles = geocode_articles(articles)

    existing = load_existing_articles()
    merged = articles + existing
    unique = deduplicate_articles(merged)

    print(f"\nTotal: {len(articles)} new, {len(existing)} existing, {len(unique)} unique")
    save_news_articles(unique)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Montgomery news")
    parser.add_argument("--poll", action="store_true", help="Run synchronously (always true for news)")
    parser.add_argument("--skip-fulltext", action="store_true", help="Skip Web Unlocker article fetch")
    parser.add_argument("--skip-geocode", action="store_true", help="Skip Google Maps geocoding step")
    args = parser.parse_args()

    run_news_pipeline(skip_fulltext=args.skip_fulltext, skip_geocode=args.skip_geocode)


if __name__ == "__main__":
    main()
