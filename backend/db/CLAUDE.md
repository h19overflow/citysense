# Database Layer

> **Self-Updating Rule:** Any new model, CRUD function, or schema change MUST be reflected here immediately after the change.

## "I want to change..." Quick Reference
| Task | Files to Touch |
|------|---------------|
| DB connection/pooling | `session.py` |
| Add new table | `models/` (new file), `models/__init__.py`, `crud/` (new file) |
| News articles schema | `models/news_article.py` |
| Comments schema | `models/news_comment.py` |
| Job listings schema | `models/job_listing.py` |
| Housing schema | `models/housing_listing.py` |
| Benefits schema | `models/benefit_service.py` |
| Citizen profile | `models/citizen_profile.py` |
| Admin profile | `models/admin_profile.py` |
| CV uploads/versions | `models/cv_upload.py` |
| CRUD for news/comments | `crud/news.py` |
| CRUD for jobs | `crud/jobs.py` |
| CRUD for housing | `crud/housing.py` |
| CRUD for benefits | `crud/benefits.py` |
| CRUD for citizens | `crud/citizen.py` |
| CRUD for admins | `crud/admin.py` |
| CRUD for CVs | `crud/cv.py` |
| CRUD for growth plans | `crud/growth.py` |
| Growth plan schema | `models/growth_plan.py` |
| Generic CRUD helpers | `crud/base.py` |

## Core Files
| File | Purpose |
|------|---------|
| `base.py` | `Base` (DeclarativeBase) — all models inherit from this |
| `session.py` | Engine, `AsyncSessionLocal`, `get_session()`, `get_db()` |

## Models (`models/`)
| File | Table | PK | Key Columns |
|------|-------|-----|-------------|
| `news_article.py` | `news_articles` | `id` (String 12) | title, category, sentiment, location (JSONB), reaction_counts (JSONB) |
| `news_comment.py` | `news_comments` | `id` (String 50) | article_id (FK), citizen_id, citizen_name, content |
| `job_listing.py` | `job_listings` | `id` (String 12) | title, company, lat/lng, properties (JSONB) |
| `housing_listing.py` | `housing_listings` | `id` (String 12) | address, price, lat/lng, properties (JSONB) |
| `benefit_service.py` | `benefit_services` | `id` (String 50) | category, title, provider, details (JSONB) |
| `citizen_profile.py` | `citizen_profiles` | `id` (UUID) | email (unique), name, salary, benefits |
| `admin_profile.py` | `admin_profiles` | `id` (UUID) | email (unique), role, department, is_active |
| `cv_upload.py` | `cv_uploads` | `id` (UUID) | citizen_id (FK→citizen_profiles), file_name, file_url |
| `cv_upload.py` | `cv_versions` | `id` (UUID) | cv_upload_id (FK→cv_uploads), version_number, content_hash (SHA-256 dedup), experience/skills/soft_skills/tools/roles/education (JSONB), summary (Text), page_count |
| `growth_plan.py` | `growth_intakes`, `roadmap_analyses` | `id` (UUID) | `GrowthIntake` (intake form + crawl data), `RoadmapAnalysis` (versioned analysis with 3 paths) |

## CRUD (`crud/`)
| File | Key Functions |
|------|--------------|
| `base.py` | `create_record()`, `get_record_by_field()`, `list_records()`, `update_record()`, `delete_record()` |
| `news.py` | `upsert_article()`, `bulk_upsert_articles()`, `list_articles()`, `bulk_upsert_comments()`, `create_comment()`, `list_comments_by_article()`, `list_all_comments()` |
| `jobs.py` | `upsert_job()`, `bulk_upsert_jobs()`, `list_jobs()`, `job_to_geojson_feature()` |
| `housing.py` | `upsert_housing()`, `bulk_upsert_housing()`, `list_housing()`, `housing_to_geojson_feature()` |
| `benefits.py` | `upsert_benefit()`, `bulk_upsert_benefits()`, `list_benefits()` |
| `citizen.py` | `create_citizen()`, `get_citizen_by_email()`, `update_citizen()` |
| `admin.py` | `create_admin()`, `get_admin_by_email()`, `update_admin()` |
| `cv.py` | `create_cv_upload()`, `get_cv_upload_with_versions()`, `list_cv_uploads_by_citizen()`, `create_cv_version()`, `get_latest_cv_version()`, `get_next_version_number()`, `find_version_by_hash()`, `list_cv_versions()` |
| `growth.py` | `create_growth_intake`, `get_growth_intake`, `update_growth_intake_crawl_data`, `create_roadmap_analysis`, `get_latest_roadmap_analysis`, `get_roadmap_analysis_by_id`, `get_next_analysis_version_number`, `list_roadmap_analyses_by_citizen`, `update_roadmap_analysis_answers` |
