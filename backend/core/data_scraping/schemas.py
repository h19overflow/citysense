"""Pydantic schemas for comment analysis pipeline.

Shared by the batch chain (structured output) and the API layer.
"""

from pydantic import BaseModel, Field
from typing import Literal


class CommentAnalysis(BaseModel):
    comment_id: str
    sentiment: Literal["positive", "neutral", "negative"]
    confidence: float = Field(ge=0.0, le=1.0)
    topics: list[str] = Field(default_factory=list, max_length=3)
    flagged: bool = False


class Recommendation(BaseModel):
    action: str = Field(description="Specific action the mayor should take")
    priority: Literal["high", "medium", "low"] = "medium"
    rationale: str = Field(description="Why this action matters, grounded in data")


class ArticleAnalysis(BaseModel):
    article_id: str
    article_sentiment: Literal["positive", "neutral", "negative"]
    article_confidence: float = Field(ge=0.0, le=1.0)
    sentiment_breakdown: dict[str, int]
    comments: list[CommentAnalysis]
    topic_clusters: list[str] = Field(default_factory=list)
    admin_summary: str = Field(max_length=500)
    urgent_concerns: list[str] = Field(default_factory=list, max_length=5)
    recommendations: list[Recommendation] = Field(
        default_factory=list,
        max_length=3,
        description="1-3 actionable recommendations for the mayor",
    )


class AnalysisResults(BaseModel):
    analyzed_at: str
    model_version: str
    prompt_version: str
    total_articles: int
    total_comments: int
    articles: list[ArticleAnalysis]
