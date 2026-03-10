# GCP Setup — One-Time Steps

Run these once before the GitLab CI pipeline can deploy.

## Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Project ID: `pegasus-489513`

```bash
export PROJECT_ID=pegasus-489513
gcloud config set project $PROJECT_ID
```

---

## 1. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Create Artifact Registry repository

```bash
gcloud artifacts repositories create pegasus \
  --repository-format=docker \
  --location=us-central1 \
  --description="Pegasus Docker images"
```

---

## 3. Create a service account for GitLab CI

```bash
gcloud iam service-accounts create gitlab-ci \
  --display-name="GitLab CI deployer"

SA=gitlab-ci@${PROJECT_ID}.iam.gserviceaccount.com

# Roles needed: push images, deploy Cloud Run, read secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/iam.serviceAccountUser"

# Download the key to your local machine
gcloud iam service-accounts keys create gitlab-ci-key.json \
  --iam-account="$SA"

# Base64-encode it into a single line — this is what you paste into GitLab
# (GitLab masked variables cannot contain whitespace)
base64 -w 0 gitlab-ci-key.json   # Linux / Git Bash on Windows
```

---

## 4. Create secrets in Secret Manager

```bash
# Gemini API key (required for chatbot)
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

# Bright Data API key (required for scrapers)
echo -n "YOUR_BRIGHTDATA_API_KEY" | \
  gcloud secrets create BRIGHTDATA_API_KEY --data-file=-
```

Grant the Cloud Run service account access to these secrets:

```bash
# Cloud Run uses the Compute Engine default SA by default.
# Get its email:
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding BRIGHTDATA_API_KEY \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Set GitLab CI/CD variables

In GitLab → **Settings → CI/CD → Variables**, add:

| Variable | Value | Protected | Masked |
|---|---|---|---|
| `GCP_SERVICE_ACCOUNT_KEY` | Output of `base64 -w 0 gitlab-ci-key.json` (single-line, no whitespace) | ✅ | ✅ |

The project-level constants (`GCP_PROJECT_ID`, `GCP_REGION`, etc.) are already
hardcoded in `.gitlab-ci.yml` — no need to set them in GitLab.

---

## 6. First deploy

Push any commit to `main` on the `gitlab` remote to trigger the pipeline:

```bash
git push gitlab main
```

Pipeline stages:
1. **build-backend** + **build-frontend** run in parallel
2. **deploy-backend** runs after build-backend
3. **deploy-frontend** runs after build-frontend AND deploy-backend
   (it reads the backend URL dynamically with `gcloud run services describe`)

After the pipeline completes, both service URLs will be printed in the
`deploy-*` job logs. The frontend URL is your public app URL.

---

## Updating secrets later

```bash
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

Cloud Run picks up the new version on the next deployment (secrets are pinned
to `:latest` in the deploy command).
