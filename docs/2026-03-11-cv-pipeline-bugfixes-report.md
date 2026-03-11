# CV Pipeline Integration — Bug Fixes & Infrastructure Report

**Date:** 2026-03-11
**Branch:** `feat/cv-pipeline-scaffold`
**Scope:** End-to-end CV upload → AI analysis → DB persistence pipeline

---

## Summary

After implementing the 21-task CV frontend-backend integration plan, we ran both servers and tested the full pipeline end-to-end. This uncovered **9 bugs and infrastructure issues** that prevented the system from functioning. All were resolved in this session.

---

## Bug #1: `brightdata` SDK v2.x Breaking Import

**Symptom:** Backend refused to start with `ImportError: cannot import name 'WebUnlocker' from 'brightdata'`.

**Root Cause:** The `brightdata` package was upgraded from v0.x to v2.2.1. The SDK completely changed its API:
- `WebUnlocker` → `WebUnlockerService`
- `crawl_single_url` → removed (replaced by `WebUnlockerService.scrape()`)
- `WebUnlocker.get_source()` → `WebUnlockerService.scrape()`
- `BrightdataEngine` / `get_engine` → moved out of `brightdata.webscraper_api.engine`

**File:** `backend/core/data_scraping/bright_data_client.py`

**Fix:** Wrapped all imports in try/except blocks with graceful fallbacks:
```python
# Before (broken)
from brightdata import WebUnlocker, crawl_single_url
from brightdata.webscraper_api.engine import BrightdataEngine, get_engine

# After (resilient)
try:
    from brightdata import WebUnlockerService as WebUnlocker
except ImportError:
    WebUnlocker = None

try:
    from brightdata.webscraper_api.engine import BrightdataEngine, get_engine
except ImportError:
    BrightdataEngine = None
    get_engine = None
```

Updated all methods (`fetch_with_unlocker`, `_get_serp_client`, `_serp_request`, `_get_engine`) to check for `None` before using the imports and to use the new `scrape()` API instead of the removed `get_source()` and `crawl_single_url()`.

**Impact:** Pre-existing issue — blocked ALL backend startup, not just CV features.

---

## Bug #2: Missing `python-multipart` Package

**Symptom:** Backend crashed on startup with `RuntimeError: Form data requires "python-multipart" to be installed`.

**Root Cause:** The CV upload endpoint uses `UploadFile` and `Form(...)` which require the `python-multipart` package for multipart form parsing. This dependency was missing from the virtual environment.

**Fix:** `uv pip install python-multipart`

**Impact:** Blocked the CV upload endpoint's `UploadFile` parameter parsing.

---

## Bug #3: Missing `celery` Package

**Symptom:** Backend crashed during lifespan startup with `ModuleNotFoundError: No module named 'celery'`.

**Root Cause:** The API lifespan hook (`backend/api/lifespan.py`) verifies the Celery broker connection on startup by importing `backend.workers.celery_app`, which requires the `celery` package.

**Fix:** `uv pip install celery`

**Impact:** Blocked all backend startup (lifespan hook is mandatory).

---

## Bug #4: Missing "Career" Navigation Tab

**Symptom:** User reported "I can't see the CV navigation button" in the frontend. The bottom nav only showed Services, News, and Profile tabs.

**Root Cause:** `CvUploadView` was never wired into the app's navigation or routing. The `MobileNav.tsx` component only defined 4 tabs (`services | admin | news | profile`) and `CommandCenter.tsx` only routed to `ServicesView`, `ProfileView`, and `NewsPage`.

**Files Modified:**
- `frontend/src/components/app/MobileNav.tsx` — Added `"career"` to `MobileTab` union type, added Career tab config with `FileText` icon
- `frontend/src/pages/CommandCenter.tsx` — Added `"career"` to `VALID_VIEWS`, imported `CvUploadView`, added `case "career"` to view switch
- `frontend/src/lib/types/common.ts` — Added `"career"` to `AppView` type union

**Fix:**
```typescript
// MobileNav.tsx — added career tab
{ id: "career", label: "Career", icon: FileText },

// CommandCenter.tsx — added career view routing
case "career":
  return <CvUploadView />;
```

**Impact:** CV feature was completely inaccessible from the UI.

---

## Bug #5: `citizen_id` Required as UUID FK

**Symptom:** CV upload returned `500 Internal Server Error` with `invalid UUID 'test-citizen-001'` when testing from curl, and `422: Field required` when the frontend sent an empty `citizen_id`.

**Root Cause:** Two issues:
1. The `citizen_id` form field was `Form(...)` (required) — if the frontend user had no `citizenMeta` in state (normal for non-persona users), it sent an empty string.
2. The `cv_uploads.citizen_id` column was `NOT NULL` with a FK to `citizen_profiles.id` — anonymous uploads were impossible.

**Files Modified:**
- `backend/api/routers/cv.py` — Changed `citizen_id: str = Form(...)` to `Form(default="")`, resolve to `None` when empty
- `backend/db/models/cv_upload.py` — Changed `citizen_id` column to `nullable=True`
- Database — `ALTER TABLE cv_uploads ALTER COLUMN citizen_id DROP NOT NULL`

**Fix:**
```python
# Router: accept empty citizen_id
citizen_id: str = Form(default="")
resolved_citizen_id = citizen_id if citizen_id else None

# Model: nullable FK
citizen_id: Mapped[str | None] = mapped_column(
    UUID(as_uuid=False),
    ForeignKey("citizen_profiles.id", ondelete="CASCADE"),
    nullable=True,
    index=True,
)
```

**Impact:** All CV uploads failed for non-persona users (i.e., real logged-in users).

---

## Bug #6: Clerk JWT Clock Skew (`iat` Validation)

**Symptom:** Console flooded with `JWT verification failed: The token is not yet valid (iat)` and `GET /api/citizen/profile 401 Unauthorized` despite the user being logged in. Tokens eventually worked after a few seconds.

**Root Cause:** PyJWT validates the `iat` (issued-at) claim by default. If the local machine's clock is even slightly behind Clerk's server clock, newly issued tokens are rejected as "not yet valid."

**File:** `backend/api/auth.py`

**Fix:** Added 30-second leeway to JWT decode:
```python
# Before
jwt.decode(token, signing_key.key, algorithms=["RS256"],
           issuer=_CLERK_ISSUER, options={"verify_aud": False})

# After
jwt.decode(token, signing_key.key, algorithms=["RS256"],
           issuer=_CLERK_ISSUER, options={"verify_aud": False},
           leeway=30)
```

**Impact:** Intermittent 401s on every page load, profile fetch failures, auth flicker.

---

## Bug #7: Celery Task Autodiscovery Failure on Windows

**Symptom:** Celery worker started successfully but rejected all incoming tasks with `KeyError: 'cv_analysis.run'` — the task wasn't registered.

**Root Cause:** `app.autodiscover_tasks(["backend.workers.tasks"])` relies on filesystem package scanning which doesn't work reliably on Windows with the `--pool=solo` option. The task module was never imported.

**File:** `backend/workers/celery_app.py`

**Fix:** Added explicit import alongside autodiscovery:
```python
app.autodiscover_tasks(["backend.workers.tasks"])

# Explicit imports to ensure tasks are registered on Windows
import backend.workers.tasks.cv_analysis  # noqa: F401, E402
```

**Verification:** `Registered tasks: ['cv_analysis.run']` confirmed after fix.

**Impact:** All CV analysis jobs stayed permanently queued — no worker could process them.

---

## Bug #8: `transformers` Package Too Old for Docling

**Symptom:** CV pipeline failed at ingestion stage with: `Transformers does not recognize this architecture... model type 'rt_detr_v2'`.

**Root Cause:** Docling uses `rt_detr_v2` (a table detection model) internally. The installed `transformers==4.48.3` didn't support this model architecture. Docling's newer version required `transformers>=5.x`.

**Fix:** `uv pip install --upgrade transformers` (4.48.3 → 5.3.0)

**Impact:** All PDF ingestion failed — no CV could be analyzed.

---

## Bug #9: Missing `education` and `summary` DB Columns

**Symptom:** Pipeline progressed through ingestion and analysis but hung at "aggregating 90%" indefinitely. Worker logs showed: `UndefinedColumnError: column cv_versions.education does not exist`.

**Root Cause:** The implementation plan added `education` (JSONB) and `summary` (Text) columns to the `CVVersion` SQLAlchemy model, but the actual database table was never migrated. The model and DB were out of sync.

**Fix:** Direct SQL migration:
```sql
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS education JSONB;
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
```

**Impact:** All CV results failed to persist — pipeline completed analysis but crashed at the save step.

---

## Bug #10: Pipeline Error Handler Missing `RuntimeError`

**Symptom:** When an invalid file was uploaded (not a real PDF), the pipeline hung at "ingesting 10%" forever instead of reporting failure. The job status never updated to "failed".

**Root Cause:** Docling raises `ConversionError` (inherits from `RuntimeError`) for invalid documents. The pipeline's except clause only caught `(FileNotFoundError, ValueError, OSError)`, so the `ConversionError` was uncaught — the error propagated out without updating the job state in Redis.

**File:** `backend/core/cv_pipeline/pipeline.py`

**Fix:**
```python
# Before
except (FileNotFoundError, ValueError, OSError) as exc:

# After
except (FileNotFoundError, ValueError, OSError, RuntimeError) as exc:
```

**Impact:** Invalid file uploads left jobs in a zombie "ingesting" state forever.

---

## Verification

After all fixes, the full pipeline was tested end-to-end:

```
Upload: POST /api/cv/upload → 200 {job_id, cv_upload_id}
  [1] queued | 0%
  [2] ingesting | 10%
  [3] analyzing | 20%
  [4] completed | 100%   ← 17 seconds total
```

**DB verification confirmed persistence:**
- `cv_uploads` row: file_name, file_url, uploaded_at
- `cv_versions` row: skills, roles, education, summary, experience, tools, soft_skills, page_count, content_hash

**Extracted data from test resume (John Doe, Software Engineer):**
- Experience: Google (Senior SWE), Microsoft (SWE)
- Skills: Python, TypeScript, Java, Go, SQL
- Tools: AWS, Docker, FastAPI, GCP, Kafka, Kubernetes, PostgreSQL, React, Redis, Terraform
- Education: BS Computer Science, MIT, 2017
- Summary: AI-generated 1-sentence professional summary

---

## Files Changed (This Session)

| File | Change |
|------|--------|
| `backend/core/data_scraping/bright_data_client.py` | SDK v2.x import compatibility |
| `backend/api/auth.py` | JWT leeway=30 for clock skew |
| `backend/api/routers/cv.py` | citizen_id optional |
| `backend/db/models/cv_upload.py` | citizen_id nullable |
| `backend/workers/celery_app.py` | Explicit task import for Windows |
| `backend/core/cv_pipeline/pipeline.py` | RuntimeError in error handler |
| `frontend/src/components/app/MobileNav.tsx` | Career tab added |
| `frontend/src/pages/CommandCenter.tsx` | Career view routing |
| `frontend/src/lib/types/common.ts` | AppView union extended |
| PostgreSQL (runtime) | cv_uploads.citizen_id DROP NOT NULL |
| PostgreSQL (runtime) | cv_versions ADD education, summary |
| pip (runtime) | python-multipart, celery, transformers upgrade |
