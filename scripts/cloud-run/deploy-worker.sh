#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-asia-northeast3}"
SERVICE_NAME="${CLOUD_RUN_SERVICE_NAME:-ai-trend-worker}"
WORKER_SA_NAME="${WORKER_SERVICE_ACCOUNT_NAME:-ai-trend-worker-runtime}"
INVOKER_SA_NAME="${INVOKER_SERVICE_ACCOUNT_NAME:-ai-trend-cron-invoker}"
SLACK_SECRET_NAME="${SLACK_SECRET_NAME:-ai-trend-slack-webhook-url}"
CRON_SECRET_NAME="${CRON_SECRET_NAME:-ai-trend-cron-secret}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-ai-trend}"
IMAGE="${IMAGE:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}/${SERVICE_NAME}:latest}"
GCLOUD_BIN="${GCLOUD_BIN:-/usr/bin/gcloud}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

if [[ ! -x "${GCLOUD_BIN}" ]]; then
  echo "GCLOUD_BIN is not executable: ${GCLOUD_BIN}" >&2
  exit 1
fi

WORKER_SA="${WORKER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
INVOKER_SA="${INVOKER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
PROJECT_NUMBER="$("${GCLOUD_BIN}" projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
CLOUD_BUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

ensure_service_account() {
  local name="$1"
  local display_name="$2"
  if ! "${GCLOUD_BIN}" iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    "${GCLOUD_BIN}" iam service-accounts create "${name}" \
      --project="${PROJECT_ID}" \
      --display-name="${display_name}"
  fi
}

ensure_service_account "${WORKER_SA_NAME}" "AI Trend worker runtime"
ensure_service_account "${INVOKER_SA_NAME}" "AI Trend cron invoker"

if ! "${GCLOUD_BIN}" artifacts repositories describe "${ARTIFACT_REPOSITORY}" --project="${PROJECT_ID}" --location="${REGION}" >/dev/null 2>&1; then
  "${GCLOUD_BIN}" artifacts repositories create "${ARTIFACT_REPOSITORY}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --repository-format=docker \
    --description="AI Trend deployment images"
fi

"${GCLOUD_BIN}" artifacts repositories add-iam-policy-binding "${ARTIFACT_REPOSITORY}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --condition=None >/dev/null

"${GCLOUD_BIN}" projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/logging.logWriter" \
  --condition=None >/dev/null

"${GCLOUD_BIN}" secrets add-iam-policy-binding "${SLACK_SECRET_NAME}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${WORKER_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None >/dev/null

"${GCLOUD_BIN}" secrets add-iam-policy-binding "${CRON_SECRET_NAME}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${WORKER_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None >/dev/null

"${GCLOUD_BIN}" builds submit \
  --project="${PROJECT_ID}" \
  --tag="${IMAGE}" .

"${GCLOUD_BIN}" run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --service-account="${WORKER_SA}" \
  --no-allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --concurrency=1 \
  --timeout=900 \
  --set-env-vars="NODE_ENV=production,CRON_REQUIRE_SECRET=true" \
  --set-secrets="SLACK_WEBHOOK_URL=${SLACK_SECRET_NAME}:latest,CRON_SECRET=${CRON_SECRET_NAME}:latest"

"${GCLOUD_BIN}" run services add-iam-policy-binding "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${INVOKER_SA}" \
  --role="roles/run.invoker" \
  --condition=None

SERVICE_URL="$("${GCLOUD_BIN}" run services describe "${SERVICE_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')"

echo "Cloud Run worker deployed: ${SERVICE_URL}"
echo "Worker service account: ${WORKER_SA}"
echo "Invoker service account: ${INVOKER_SA}"
