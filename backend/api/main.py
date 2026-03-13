"""Unified FastAPI app — comment analysis, mayor chat, webhooks, and SSE."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to the project root regardless of working directory
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.lifespan import lifespan
from backend.api.routers import analysis, auth, benefits, career_analyze, career_chat, chat, citizen_chat, citizen_profile, comments, cv, cv_latest, growth, housing, jobs, misinfo, news, roadmap, stream, webhooks
from backend.core.exceptions import AppException


_extra = os.getenv("CORS_ORIGINS", "")
ALLOWED_ORIGINS = ["*"] if os.getenv("CORS_ALLOW_ALL", "1") == "1" else [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8085",
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
app.include_router(news.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(housing.router, prefix="/api")
app.include_router(benefits.router, prefix="/api")
app.include_router(cv.router, prefix="/api")
app.include_router(cv_latest.router, prefix="/api")
app.include_router(career_analyze.router, prefix="/api")
app.include_router(career_chat.router, prefix="/api")
app.include_router(growth.router, prefix="/api")


@app.get("/health")
async def health():
    """Health check endpoint."""
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "streams": ["jobs", "news", "housing", "benefits"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
