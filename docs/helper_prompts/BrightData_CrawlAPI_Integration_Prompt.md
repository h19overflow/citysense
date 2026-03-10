# Prompt Pack — Bright Data Crawl API Integration (Drop‑in for Any Web App)

You are a **senior full‑stack engineer**. Your job is to **integrate Bright Data’s Crawl API** into the user’s existing web application with a clean UI/UX and a safe(ish) key-handling approach.

This prompt is designed to be pasted into Cursor / Windsurf / Copilot Chat / ChatGPT and produce implementation-ready code.

---

## 0) First: Load the Official Documentation Index

Before implementing, fetch and skim the documentation index:

- https://docs.brightdata.com/llms.txt

Use it to discover *all* Crawl API + Web Scraper API pages, then confirm:
- endpoints and parameters used below
- any required headers, limits, or response shapes

> If the docs disagree with anything in this prompt, prefer the docs.

---

## 1) What to Build (High-Level)

### A) Settings Modal: Add a “Bright Data” tab
Add a **new tab** inside the app’s **Settings** modal:

**Tab name:** `Bright Data`  
**Fields:**
1. **API Key** (password input + show/hide toggle)
2. **Dataset ID** (text input; required for Crawl API trigger)
3. **Default Output Fields** (multi-select or pipe-separated string):
   - common values: `markdown`, `html`, `ld_json`, `page_html`, `html2text`
4. **Include Errors** toggle (default `true`)
5. **Download Format** select:
   - `json`, `ndjson`, `jsonl`, `csv`
6. Advanced (collapsible):
   - **compress** toggle
   - **batch_size** integer (>= 1000) + optional **part** number
   - **delivery** configuration (optional): webhook / S3 / GCS / etc.

**Actions:**
- “Save”
- “Test” (validate key + dataset_id by calling a harmless endpoint)
- “Clear Key” (removes local storage / clears server-stored secret)
- “View Recent Snapshots” (lists snapshots for the dataset_id)

### B) Full Crawl API Workflow
Implement the full async flow:

1. **Trigger crawl** with URL list → receive `snapshot_id`
2. **Poll progress** using `snapshot_id` until status is `ready` or `failed`
3. **Download snapshot** when ready
4. Optional:
   - **Cancel snapshot**
   - **Deliver snapshot** (S3/GCS/Webhook/etc.) and **monitor delivery**
   - **Download in parts** (batching)

### C) Provide a Small “Crawl Runner” UI (minimal but usable)
Add a minimal UI surface somewhere in the app (or a dev page) so the integration can be tested end-to-end:
- textarea for URLs (1 per line)
- run button
- progress indicator
- output viewer (render markdown; show JSON; download file)
- show raw API errors

This can be a standalone route/page or a panel component.

---

## 2) Security Model (Pick One; implement both if feasible)

### Option 1 (recommended): Server Proxy
- Store the API key **server-side** (env var or encrypted secret store).
- Browser calls your server: `/api/brightdata/*`
- Server calls Bright Data with `Authorization: Bearer <API_KEY>`

**Pros:** key not exposed to end users  
**Cons:** requires backend

### Option 2 (acceptable for single-user/dev): Direct-from-Browser
- Store key in localStorage and call Bright Data directly from the browser.

**Pros:** easiest  
**Cons:** key is exposed in the client + network inspector

**Requirement:** If you implement Option 2, clearly label it “Dev / Single-user mode” in the UI and provide a toggle.

---

## 3) Bright Data Endpoints You Must Implement

> Use `Authorization: Bearer YOUR_API_KEY` for all calls.

### 3.1 Trigger Crawl (Crawl API)
**POST** `https://api.brightdata.com/datasets/v3/trigger`

**Query params**
- `dataset_id` (required)
- `include_errors` (boolean; recommended `true`)
- `custom_output_fields` (pipe-separated string like `markdown|ld_json|html`)

**Body**
- JSON array of objects, typically: `[{ "url": "https://example.com" }, ...]`

**Response**
- `{ "snapshot_id": "s_..." }`

### 3.2 Monitor Progress
**GET** `https://api.brightdata.com/datasets/v3/progress/{snapshot_id}`

Response includes:
- `snapshot_id`
- `dataset_id`
- `status`: `starting | running | ready | failed`

### 3.3 Download Snapshot
**GET** `https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}`

Query params:
- `format`: `json | ndjson | jsonl | csv`
- `compress`: boolean
- `batch_size`: integer (>= 1000)
- `part`: integer (only when batching)

### 3.4 List Snapshots (for a Dataset)
**GET** `https://api.brightdata.com/datasets/v3/snapshots?dataset_id=...`
Support filters:
- `status`, `skip`, `limit`, `from_date`, `to_date`, `with_total`, `trigger_type`

### 3.5 Cancel Snapshot
**POST** `https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}/cancel`

### 3.6 Download in Parts
If you requested download/delivery in batches, also implement:
**GET** `https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}/parts`

### 3.7 Deliver Snapshot (Optional, but “full” integration should include it)
**POST** `https://api.brightdata.com/datasets/v3/deliver/{snapshot_id}`

Query param:
- `notify`: URL to notify when delivery finished (optional)

Body supports many delivery types (Webhook, S3, GCS, SFTP, Snowflake, etc.).

Response:
- `{ "delivery_id": "..." }`

Monitor delivery:
**GET** `https://api.brightdata.com/datasets/v3/delivery/{delivery_id}`

---

## 4) Implementation Requirements (Non-Negotiable)

### 4.1 No breaking changes
- Do not break existing settings UI or routing.
- If the app already has a Settings modal, **add a tab**.
- If it doesn’t, create a Settings modal consistent with the app design.

### 4.2 Storage
- Store settings in a single namespace, e.g.:
  - `app.settings.integrations.brightdata`
- If client-side: store in `localStorage` under a single key:
  - `settings.integrations.brightdata`
- Never log the API key.

### 4.3 Typed client wrapper + robust error handling
Create a Bright Data SDK wrapper with:
- typed request/response interfaces
- centralized error normalization
- retry strategy for transient errors
- cancellation support for polling (AbortController)
- exponential backoff with jitter for progress polling

### 4.4 CORS / Networking
If calling Bright Data directly from the browser:
- handle CORS failures gracefully
- recommend switching to server proxy

### 4.5 Observability
Add debug-level logs (no secrets) and a small “integration diagnostics” panel:
- last 10 requests (method, endpoint, status, duration)
- last error
- last snapshot_id + status

---

## 5) Suggested File/Module Layout (Adapt to the App)

**Client**
- `src/integrations/brightdata/brightdataClient.ts` (fetch wrapper)
- `src/integrations/brightdata/types.ts`
- `src/integrations/brightdata/polling.ts`
- `src/ui/settings/BrightDataSettingsTab.(tsx|vue|svelte|js)`
- `src/ui/brightdata/CrawlRunner.(tsx|...)` (minimal runner UI)

**Server (if available)**
- `server/routes/brightdata.ts` or `pages/api/brightdata/*` or similar
- `server/lib/brightdata.ts` (server-side wrapper)
- secret storage: env `BRIGHTDATA_API_KEY` OR encrypted per-user key store

---

## 6) Acceptance Criteria (Write Tests or Manual Test Steps)

### Settings
- [ ] “Bright Data” tab exists in Settings modal
- [ ] API key can be saved/cleared (masked by default)
- [ ] Dataset ID + output fields can be saved
- [ ] “Test” validates credentials and shows a clear success/error message

### Crawl Run
- [ ] Enter URLs → Trigger returns snapshot_id
- [ ] UI polls progress until ready/failed
- [ ] When ready, data downloads and is viewable
- [ ] If failed, UI shows logs/status and next steps
- [ ] Cancel stops polling and cancels snapshot server-side

### Delivery (optional)
- [ ] Can request delivery, get delivery_id, and monitor delivery status
- [ ] If batching is used, can discover number of parts and download them all

---

## 7) Output Format (What You Must Return)

When you respond, return:

1. **A short plan** (5–10 bullets)
2. **A list of files changed/added**
3. **Full source code** for each new/changed file (or a unified diff)
4. **Manual test checklist** (copy/paste runnable)
5. **Notes** on:
   - security mode chosen
   - known limitations (CORS, retention, batching)

---

## 8) Implementation Notes / Gotchas

- Polling: use backoff (e.g., 1s → 2s → 4s … capped at 10s) and stop after a timeout (e.g., 10–20 minutes).
- Download batching:
  - First download with `batch_size` and `part=1`
  - Then call `/snapshot/{id}/parts` to learn part count
  - Then download `part=2..N` with same `format/compress/batch_size`
- If download returns “not ready” errors, keep polling `progress`.
- Don’t assume response format is always JSON: `csv` and `ndjson` are text streams.

---

## 9) Minimal API Wrapper Skeleton (Pseudo-code; adapt to stack)

```ts
type BrightDataConfig = {
  apiKey: string;
  datasetId: string;
  includeErrors: boolean;
  customOutputFields: string; // pipe-separated
};

async function triggerCrawl(urls: string[], cfg: BrightDataConfig): Promise<{ snapshot_id: string }> {
  // POST /datasets/v3/trigger?dataset_id=...&include_errors=...&custom_output_fields=...
}

async function getProgress(snapshotId: string, cfg: BrightDataConfig): Promise<{ status: 'starting'|'running'|'ready'|'failed' }> {
  // GET /datasets/v3/progress/{snapshot_id}
}

async function downloadSnapshot(snapshotId: string, opts: { format?: string; compress?: boolean; batch_size?: number; part?: number }, cfg: BrightDataConfig) {
  // GET /datasets/v3/snapshot/{snapshot_id}?format=...
}

async function listSnapshots(cfg: BrightDataConfig, filters?: Record<string,string|number|boolean>) {
  // GET /datasets/v3/snapshots?dataset_id=...
}
```

---

## 10) Done Means “Shippable”
Do not stop at “here’s how you’d do it.” Implement the complete integration in code, wired into the actual app UI, with clear testing steps.

