# Repo Restructure — Refactoring Only

**Goal:** Restructure the repo from `scripts/` + `montgomery-navigator/` into `backend/` + `frontend/`, deduplicate shared code, split oversized files, delete dead code, and update docs. NO implementation changes, NO new features.

**Constraints:**
- Refactoring only — no behavior changes
- No News tab wiring
- No Co-Authored-By tags in commits
- Worktrees + parallel agents for speed

---

## Phase 1: Directory Renames

### Task 1: Rename `scripts/` → `backend/` + update all imports

- `git mv scripts backend`
- Global find-replace: `from scripts.` → `from backend.` across all `.py` files
- Update `pyproject.toml` description
- Verify: `python -c "from backend.config import REPO_ROOT; print(REPO_ROOT)"`
- Commit: `refactor: rename scripts/ → backend/`

### Task 2: Rename `montgomery-navigator/` → `frontend/` + update config

- `git mv montgomery-navigator frontend`
- Update `backend/config.py` line 63: `"montgomery-navigator"` → `"frontend"`
- Verify: `cd frontend && npm run build`
- Commit: `refactor: rename montgomery-navigator/ → frontend/`

---

## Phase 2: Code Deduplication & Splitting

### Task 3: Extract duplicated `geocode_nominatim` to shared util

- Create `backend/processors/geocoding_utils.py` with the shared function
- Remove duplicate definitions from `process_jobs.py` and `process_housing.py`, replace with import
- Verify imports work
- Commit: `refactor(processors): extract shared geocode_nominatim to geocoding_utils`

### Task 4: Split `config.py` — move payloads to `payloads.py`

- Create `backend/payloads.py` with `JOB_SCRAPERS`, `NEWS_QUERIES`, `BENEFITS_TARGETS`, `SKILL_CATEGORIES`
- Trim `config.py` to ~75 lines (credentials, paths, constants only)
- Update all consumer imports
- Verify imports work
- Commit: `refactor(config): split payloads from config.py`

---

## Phase 3: Dead Code Removal

### Task 5: Remove dead Python code

- Delete `get_api_token()` from `config.py` (never called — `get_api_key()` used instead)
- Delete `scan_output_for_pii()` from `processors/redact_pii.py` (never called)
- Delete `scrape_transit.py` (standalone, not imported anywhere)
- Commit: `refactor: remove dead Python code`

### Task 6: Remove dead frontend pages

- Delete `pages/Chat.tsx` (route redirects to `/app/services`, component not imported)
- Delete `pages/Onboarding.tsx` (route redirects to `/app/services`, component not imported)
- Commit: `refactor: remove dead frontend pages`

---

## Phase 4: Documentation Updates

### Task 7: Update `docs/CLAUDE.md` paths

- `montgomery-navigator/` → `frontend/` everywhere
- `scripts/` → `backend/` everywhere
- Remove the "NEXT STAGE: News Tab" section (not being built)
- Commit: `docs: update paths for repo restructure`

### Task 8: Update `README.md` paths

- Same path replacements
- Update uvicorn command: `scripts.webhook_server:app` → `backend.webhook_server:app`
- Commit: `docs: update README paths for repo restructure`

---

## Phase 5: Verification

### Task 9: Full import + build verification

- Verify all Python imports work (config, payloads, processors, agents, api)
- Verify `grep -r "from scripts\." backend/` returns 0 results
- Verify `grep -r "montgomery-navigator" backend/` returns 0 results
- Verify `cd frontend && npm run build` succeeds
