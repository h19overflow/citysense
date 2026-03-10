"""Misinfo analysis endpoint — proxies Gemini API calls server-side."""

import asyncio
import json
import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import google.generativeai as genai

from backend.core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["misinfo"])

SYSTEM_PROMPT = (
    "You are a fact-checking assistant analyzing local news articles from Montgomery, Alabama.\n"
    "For each article assess its misinformation risk 0-100:\n"
    "- 0-30  Low:    Credible outlet, claims consistent with excerpt, factual tone\n"
    "- 31-60 Medium: Unverified source, emotional framing, or unsubstantiated claims\n"
    "- 61-100 High:  Unknown source, sensational/misleading headline, no supporting evidence\n\n"
    "Trusted outlets: montgomeryadvertiser.com, wsfa.com, al.com, waka.com, .gov domains, alreporter.com.\n"
    'Return ONLY valid JSON: { "results": [{ "articleId": string, "risk": number, "reason": string }] }'
)

MODEL_NAME = "gemini-2.0-flash"

# Configure Gemini once at module load
_api_key = os.getenv("GEMINI_API_KEY", "")
if _api_key:
    genai.configure(api_key=_api_key)


class ArticleItem(BaseModel):
    id: str
    title: str
    excerpt: str
    source: str
    category: str


class MisinfoRequest(BaseModel):
    articles: list[ArticleItem] = Field(max_length=50)


class MisinfoScore(BaseModel):
    articleId: str
    risk: int
    reason: str


class MisinfoResponse(BaseModel):
    results: list[MisinfoScore]


def _call_gemini(articles_json: list[dict]) -> list[dict]:
    """Synchronous Gemini call — runs in a thread via asyncio.to_thread."""
    if not _api_key:
        raise ExternalServiceError(
            "Gemini API key not configured",
            {"model": MODEL_NAME},
        )

    model = genai.GenerativeModel(MODEL_NAME)
    prompt = f"{SYSTEM_PROMPT}\n\nAnalyze these {len(articles_json)} articles:\n{articles_json}"

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            max_output_tokens=2048,
        ),
    )

    parsed = json.loads(response.text)
    return parsed.get("results", [])


@router.post("/misinfo/analyze", response_model=MisinfoResponse)
async def analyze_misinfo(body: MisinfoRequest) -> MisinfoResponse:
    """Analyze articles for misinformation risk using Gemini."""
    articles_json = [a.model_dump() for a in body.articles]

    try:
        results = await asyncio.to_thread(_call_gemini, articles_json)
    except ExternalServiceError as exc:
        logger.error(
            "Gemini service unavailable",
            extra={"code": exc.code, "message": exc.message},
        )
        raise HTTPException(status_code=503, detail="Gemini service is currently unavailable") from exc
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.error("Gemini response parsing failed", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="Failed to parse Gemini response") from exc
    except Exception as exc:
        logger.error("Unexpected Gemini API error", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="Gemini API call failed") from exc

    return MisinfoResponse(results=[MisinfoScore(**r) for r in results])
