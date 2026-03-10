"""Unified FastAPI app — comment analysis, mayor chat, webhooks, and SSE."""

import asyncio
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routers import analysis, auth, chat, citizen_chat, citizen_profile, comments, misinfo, roadmap, stream, webhooks
from backend.core.exceptions import AppException


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Start background scraping on server boot if API key is available."""
    scraper_task = None
    auto_scrape = os.environ.get("AUTO_SCRAPE", "0") != "0"
    has_api_key = bool(os.environ.get("BRIGHTDATA_API_KEY"))

    if auto_scrape and has_api_key:
        from backend.core.scrape_scheduler import start_scheduled_scraping
        scraper_task = asyncio.create_task(start_scheduled_scraping())

    yield

    if scraper_task:
        scraper_task.cancel()


_extra = os.getenv("CORS_ORIGINS", "")
ALLOWED_ORIGINS = ["*"] if os.getenv("CORS_ALLOW_ALL", "1") == "1" else [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",
] + ([o.strip() for o in _extra.split(",") if o.strip()] if _extra else [])

app = FastAPI(title="MontgomeryAI", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AppException)
async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "message": exc.message, "details": exc.details},
    )


app.include_router(auth.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(citizen_chat.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(roadmap.router, prefix="/api")
app.include_router(misinfo.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(citizen_profile.router, prefix="/api")


@app.get("/health")
async def health():
    """Health check endpoint."""
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "streams": ["jobs", "news", "housing", "benefits"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
