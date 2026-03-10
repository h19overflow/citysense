FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first for layer caching (no source code yet)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source
COPY backend/ ./backend/
COPY frontend/public/data/news_feed.json ./backend/data/news_feed.json

EXPOSE 8080

# Cloud Run sets PORT=8080; hardcoded here to match --port 8080 in deploy
CMD ["uv", "run", "uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
