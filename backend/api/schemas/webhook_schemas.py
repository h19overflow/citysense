"""Pydantic models for Bright Data webhook request payloads."""

from pydantic import BaseModel


class JobRecord(BaseModel):
    """A single raw job record from Bright Data (Indeed/LinkedIn/Glassdoor)."""

    model_config = {"extra": "allow"}

    job_title: str | None = None
    company_name: str | None = None
    url: str | None = None


class NewsWebhookBody(BaseModel):
    """SERP response body delivered by Bright Data for news searches."""

    model_config = {"extra": "allow"}

    news: list[dict] | None = None
    organic: list[dict] | None = None
    results: list[dict] | None = None


class ZillowListing(BaseModel):
    """A single raw Zillow listing from Bright Data."""

    model_config = {"extra": "allow"}

    address: str | None = None
    price: str | int | float | None = None
    url: str | None = None
