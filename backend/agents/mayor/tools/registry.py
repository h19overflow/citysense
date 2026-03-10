"""Registers all LangChain @tool wrappers for the mayor chat agent.

Wraps raw functions from analysis_tools.py (analysis) and news_tools.py (news feed)
so the agent runtime can discover and invoke them.
"""

from langchain_core.tools import tool

from backend.agents.mayor.tools import analysis_tools
from backend.agents.mayor.tools import news_tools
from backend.agents.mayor.tools import predictive_tools
from backend.agents.common import web_search as web_search_tool


# ---------------------------------------------------------------------------
# Analysis tools (from analysis_results.json)
# ---------------------------------------------------------------------------

@tool
def get_sentiment_summary(time_range: str = "7d") -> str:
    """Get city-wide sentiment breakdown and trend for a time range."""
    return analysis_tools.get_sentiment_summary(time_range)


@tool
def get_top_concerns(limit: int = 5, neighborhood: str | None = None) -> str:
    """Get ranked citizen concerns with comment counts, optionally by neighborhood."""
    return analysis_tools.get_top_concerns(limit, neighborhood)


@tool
def get_neighborhood_mood(neighborhood: str) -> str:
    """Get sentiment breakdown and top articles for a specific neighborhood."""
    return analysis_tools.get_neighborhood_mood(neighborhood)


@tool
def get_article_details(article_id: str) -> str:
    """Get full analysis for a specific article including all comment sentiments."""
    return analysis_tools.get_article_details(article_id)


# ---------------------------------------------------------------------------
# News feed tools (from news_feed.json + exported_comments.json)
# ---------------------------------------------------------------------------

@tool
def get_trending_articles(limit: int = 5) -> str:
    """Get top articles ranked by total citizen engagement (upvotes + downvotes + comments)."""
    return news_tools.get_trending_articles(limit)


@tool
def search_news_by_topic(query: str) -> str:
    """Search articles by keyword across title, excerpt, and body (case-insensitive)."""
    return news_tools.search_news_by_topic(query)


@tool
def get_news_by_category(category: str) -> str:
    """Get article count, sentiment breakdown, and top titles for a news category."""
    return news_tools.get_news_by_category(category)


@tool
def get_recent_comments(article_id: str | None = None, limit: int = 10) -> str:
    """Get recent citizen comments. Pass an article ID or partial title to filter. Returns all if no filter."""
    return news_tools.get_recent_comments(article_id, limit)


# ---------------------------------------------------------------------------
# Predictive analysis tools (hotspot scoring + trend detection)
# ---------------------------------------------------------------------------

@tool
def get_predictive_hotspots(neighborhood: str | None = None, risk_level: str | None = None) -> str:
    """Get predictive hotspot scores showing which neighborhoods are at risk. Filter by neighborhood name or risk level (critical/high/medium/low)."""
    return predictive_tools.get_predictive_hotspots(neighborhood, risk_level)


@tool
def get_predictive_trends(category: str | None = None) -> str:
    """Get complaint trend analysis showing rising/falling categories. Optionally filter by complaint category."""
    return predictive_tools.get_predictive_trends(category)


# ---------------------------------------------------------------------------
# Web search tool (Bright Data SERP zone, scoped to Montgomery)
# ---------------------------------------------------------------------------

@tool
def search_montgomery_web(query: str) -> str:
    """Search the web for Montgomery-specific news and information when local data is insufficient."""
    return web_search_tool.search_montgomery_web(query)


# ---------------------------------------------------------------------------
# Master tool list consumed by the agent
# ---------------------------------------------------------------------------

TOOLS = [
    get_sentiment_summary,
    get_top_concerns,
    get_neighborhood_mood,
    get_article_details,
    get_trending_articles,
    search_news_by_topic,
    get_news_by_category,
    get_recent_comments,
    get_predictive_hotspots,
    get_predictive_trends,
    search_montgomery_web,
]
