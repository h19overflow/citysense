# DevOps & Infrastructure — Bug Fixes Report

**Date:** 2026-03-12
**Branch:** `feat/cv-pipeline-scaffold`
**Scope:** Local dev environment — Docker Compose, Redis, backend startup, SSE streaming

---

## Summary

After the CV pipeline was integrated, we set up a full local dev environment
(`start.ps1` → Docker + backend + frontend) and tested the SSE stream endpoint.
This uncovered **6 infrastructure issues** that prevented services from starting
and Redis-backed features from working. All were resolved in this session.

---

## Issue #1: `start.ps1` Did Not Start Docker Services

**Symptom:** Running `start.ps1` only started the backend and frontend. PostgreSQL,
Redis, and the Celery worker were never launched, so any feature touching the DB
or job queue failed silently.

**Root Cause:** The original `start.ps1` had no Docker Compose integration — it
only spawned two PowerShell windows for uvicorn and npm.

**Fix:** Added `docker compose up -d` as the first step, with an early-exit guard
if Docker is not running.

```powershell
docker compose -f "$root\docker-compose.yml" up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose failed. Make sure Docker is running." -ForegroundColor Red
    exit 1
}
```

**Commit:** `feat(start): add Docker Compose orchestration to start script`

---

## Issue #2: Redis Port 6379 Conflict with `aria-redis`

**Symptom:** `docker compose up` failed with:
```
Bind for 0.0.0.0:6379 failed: port is already allocated
```

**Root Cause:** Another project (`aria-redis`) was already occupying host port 6379.
The `docker-compose.yml` mapped Redis to `6379:6379` without accounting for this.

**Fix:**
- Changed Redis host port mapping to `6380:6379` in `docker-compose.yml`
- Updated default `REDIS_URL` fallback in `celery_app.py` and `cv.py` to
  `redis://localhost:6380/0`

**Files changed:**
- `docker-compose.yml`
- `backend/workers/celery_app.py`
- `backend/api/routers/cv.py`

**Commit:** `fix(redis): remap Redis port to 6380 to avoid host conflict`

---

## Issue #3: Celery Missing from Project Dependencies

**Symptom:** The Celery worker container crashed immediately with:
```
error: Failed to spawn: `celery`
  Caused by: No such file or directory (os error 2)
```

**Root Cause:** `celery` was not in `pyproject.toml`. It had been used in code
(`backend/workers/`) but was never declared as a dependency. `uv sync --no-dev`
inside the Docker image therefore never installed it.

**Fix:** Added `celery[redis]>=5.3` to `pyproject.toml` dependencies and ran
`uv lock && uv sync` to update the lockfile.

**Commit:** `feat(deps): add celery[redis] to project dependencies`

---

## Issue #4: `REDIS_URL` Not in `.env` → 503 on SSE Endpoint

**Symptom:** Every request to `GET /api/cv/jobs/{id}/stream` returned:
```json
{"detail": "Redis unavailable"}
503 Service Unavailable
```

**Root Cause:** The `RedisCache` singleton (`redis_client.py`) reads `REDIS_URL`
from the environment at initialisation time. Because `REDIS_URL` was never added
to `.env`, it got `None`, set `_client = None`, and `is_available()` returned
`False` on every call — even though the Redis container was healthy.

**Fix (three parts):**

1. **Added `REDIS_URL` to `.env`:**
   ```
   REDIS_URL=redis://localhost:6380/0
   ```

2. **Anchored `.env` path in `main.py`** so it loads correctly regardless of
   the working directory set by `Start-Process`:
   ```python
   load_dotenv(Path(__file__).resolve().parents[2] / ".env")
   ```

3. **Lazy-init in `redis_client.py`** — if `_client` is `None` when
   `is_available()` is called, attempt `_init_client()` again so processes
   that started before `.env` was written can self-heal:
   ```python
   def is_available(self) -> bool:
       if not self._client:
           self._init_client()
       ...
   ```

4. **Created `.env.example`** documenting all required environment variables
   so this can never happen again.

**Commits:**
- `fix(redis): resolve Redis unavailable 503 on CV SSE stream`
- `docs(env): add .env.example with REDIS_URL and all required variables`

---

## Issue #5: `python-multipart` Missing → RuntimeError on CV Upload

**Symptom:** Backend crashed on startup after the SSE changes were reloaded:
```
RuntimeError: Form data requires "python-multipart" to be installed.
```

**Root Cause:** FastAPI requires `python-multipart` to handle `multipart/form-data`
(used by the `POST /api/cv/upload` endpoint). It was a transitive dependency that
happened to be installed before but was not declared in `pyproject.toml`. After
the `uv sync` lockfile churn from adding celery, it was no longer pulled in.

**Fix:** Added `python-multipart>=0.0.22` to `pyproject.toml` as an explicit
production dependency.

**Commit:** `fix(deps): add python-multipart; fix start.ps1 port cleanup for bash processes`

---

## Issue #6: Backend Port 8082 Blocked by Unkillable WSL2 Ghost Process

**Symptom:** Every attempt to start a fresh uvicorn on port 8082 failed:
```
[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8082):
[WinError 10048] only one usage of each socket address is normally permitted
```

`netstat` reported PID 40780 listening on 8082, but:
- `Stop-Process -Id 40780` — "Cannot find a process with the process identifier"
- `taskkill /PID 40780 /F` — "The process not found"
- `kill -9` from bash — process not in bash's namespace
- `wsl --shutdown` — cleared WSL but Docker port mappings broke

**Root Cause:** WSL2 mirrored networking (Windows 11) forwards ports between the
WSL2 kernel and the Windows TCP stack. A previous uvicorn process started inside
a Git Bash session left a socket held by the WSL2 kernel that survived process
death. The PID reported by `Get-NetTCPConnection` is a WSL namespace PID —
invisible and unkillable from the Windows process table.

**Fix:** Moved the backend permanently to **port 8085** (confirmed free) and
updated all references:

| File | Change |
|------|--------|
| `start.ps1` | `--port 8082` → `--port 8085` |
| `backend/api/main.py` | CORS allowed origins |
| `frontend/src/lib/apiConfig.ts` | `DEFAULT_BACKEND_URL` |
| `.env.example` | Added note about port choice |

Also fixed `start.ps1` kill logic to use `bash -c kill` instead of `taskkill`,
since `taskkill` cannot reach Git Bash-spawned processes (different PID namespace).

**Commit:** `fix(port): move backend to 8085; fix redis-py version; cleanup`

---

## Issue #7: `redis-py` 6.x Incompatible with Redis Server 7.4

**Symptom:** After WSL reset forced Docker container restart, all Redis connections
failed with:
```
redis.exceptions.ConnectionError: Connection closed by server.
```

**Root Cause:** Adding `celery[redis]>=5.3` caused `uv` to resolve to
`redis==6.4.0` (celery's dependency). The `redis-py` 6.x client introduced
`CLIENT NO-EVICT off` and `CLIENT NO-TOUCH off` health-check commands sent on
every new connection. The Redis 7.4 server in the Docker container rejected these
commands and closed the connection immediately.

**Fix:** Pinned `redis>=7.0.0` in `pyproject.toml`, which forced `uv` to
downgrade celery to `5.3.1` (compatible with redis-py 7.x) while keeping Redis
connections functional.

**Commit:** `fix(port): move backend to 8085; fix redis-py version; cleanup`

---

## Final State

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5432 | healthy |
| Redis | 6380 | healthy |
| Celery worker | — | running |
| Backend (uvicorn) | 8085 | running, Redis connected |
| Frontend (Vite) | 8080 | running |
| SSE `/api/cv/jobs/{id}/stream` | — | **HTTP 200** |

To start all services: `./start.ps1`
