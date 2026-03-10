# Data Layer Build-Out: Models, CRUD, Scrapers, API, Frontend

**Date:** 2026-03-11
**Branch:** `feat/data-layer-buildout`

## Problem

Scrapers save to static JSON files in `frontend/public/data/`. Frontend reads those files directly. No proper data layer exists for news, jobs, housing, or benefits. Comments have no persistent DB storage.

## Decision

PostgreSQL for everything. JSONB columns for semi-structured fields (location, skills, income_limits). No Firestore — data is structured enough, and a single DB avoids operational overhead.

## Scope

1. Alembic setup (init + async config)
2. 5 new DB models (news_articles, news_comments, job_listings, housing_listings, benefit_services)
3. 4 CRUD modules (news, jobs, housing, benefits)
4. Initial Alembic migration for all tables
5. Scraper rewiring — save to DB instead of JSON
6. API endpoints — serve from DB
7. Frontend rewiring — fetch from API instead of static files

## Models

### news_articles
- id VARCHAR(12) PK (scraper hash)
- title VARCHAR(500), excerpt TEXT, body TEXT
- source VARCHAR(255), source_url VARCHAR(2048), image_url VARCHAR(2048) nullable
- category VARCHAR(50), published_at VARCHAR(100), scraped_at TIMESTAMPTZ
- upvotes INTEGER default 0, downvotes INTEGER default 0, comment_count INTEGER default 0
- sentiment VARCHAR(20) nullable, sentiment_score FLOAT nullable, misinfo_risk FLOAT nullable, summary TEXT nullable
- location JSONB nullable, reaction_counts JSONB nullable
- Indexes: category, scraped_at

### news_comments
- id VARCHAR(50) PK (client-generated cmt-{timestamp})
- article_id VARCHAR(12) FK -> news_articles
- citizen_id UUID FK -> citizen_profiles
- citizen_name VARCHAR(255), avatar_initials VARCHAR(5), avatar_color VARCHAR(20)
- content TEXT, created_at TIMESTAMPTZ
- Index: article_id

### job_listings
- id VARCHAR(12) PK, title VARCHAR(500), company VARCHAR(255)
- source VARCHAR(50), address VARCHAR(500)
- lat FLOAT nullable, lng FLOAT nullable
- url VARCHAR(2048), scraped_at TIMESTAMPTZ
- properties JSONB (salary, skills, seniority, etc.)

### housing_listings
- id VARCHAR(12) PK, address VARCHAR(500)
- price INTEGER nullable, lat/lng FLOAT nullable
- scraped_at TIMESTAMPTZ
- properties JSONB (beds, baths, sqft, status, urls, etc.)

### benefit_services
- id VARCHAR(50) PK, category VARCHAR(100), title VARCHAR(500)
- provider VARCHAR(255), description TEXT
- url VARCHAR(2048), phone VARCHAR(30), scraped_at TIMESTAMPTZ
- details JSONB (eligibility, income_limits, how_to_apply, documents)

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/news | List articles (paginated, category filter) |
| GET | /api/news/:id | Single article |
| GET | /api/jobs | Jobs as GeoJSON FeatureCollection |
| GET | /api/housing | Housing as GeoJSON FeatureCollection |
| GET | /api/benefits | List benefit services |
| GET | /api/comments | Rewire existing to DB |
| POST | /api/comments | Rewire existing to DB |

## Commit Plan

1. chore(db): initialize Alembic with async PostgreSQL
2. feat(db): add news, jobs, housing, benefits models
3. feat(db): add CRUD modules for all new models
4. feat(db): add initial Alembic migration for all tables
5. refactor(scrapers): save to database instead of JSON files
6. feat(api): add endpoints to serve news, jobs, housing, benefits from DB
7. refactor(frontend): fetch data from API endpoints instead of static files
