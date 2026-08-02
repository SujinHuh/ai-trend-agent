#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-asia-northeast3}"
SERVICE_NAME="${CLOUD_RUN_SERVICE_NAME:-ai-trend-worker}"
INVOKER_SA_NAME="${INVOKER_SERVICE_ACCOUNT_NAME:-ai-trend-cron-invoker}"
JOB_NAME="${SCHEDULER_JOB_NAME:-ai-trend-daily-digest}"
SCHEDULE="${SCHEDULE:-0 7 * * *}"
TIME_ZONE="${TIME_ZONE:-Asia/Seoul}"
CRON_SECRET_NAME="${CRON_SECRET_NAME:-ai-trend-cron-secret}"
CRON_SECRET_VALUE="${CRON_SECRET_VALUE:-}"
GCLOUD_BIN="${GCLOUD_BIN:-/usr/bin/gcloud}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

if [[ ! -x "${GCLOUD_BIN}" ]]; then
  echo "GCLOUD_BIN is not executable: ${GCLOUD_BIN}" >&2
  exit 1
fi

if [[ -z "${CRON_SECRET_VALUE}" ]]; then
  CRON_SECRET_VALUE="$("${GCLOUD_BIN}" secrets versions access latest --secret="${CRON_SECRET_NAME}" --project="${PROJECT_ID}")"
fi

SERVICE_URL="$("${GCLOUD_BIN}" run services describe "${SERVICE_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')"
INVOKER_SA="${INVOKER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if "${GCLOUD_BIN}" scheduler jobs describe "${JOB_NAME}" --project="${PROJECT_ID}" --location="${REGION}" >/dev/null 2>&1; then
  "${GCLOUD_BIN}" scheduler jobs update http "${JOB_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${SCHEDULE}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${SERVICE_URL}/cron" \
    --http-method=POST \
    --update-headers="Content-Type=application/json,X-Cron-Secret=${CRON_SECRET_VALUE}" \
    --message-body='{"mode":"send"}' \
    --oidc-service-account-email="${INVOKER_SA}" \
    --oidc-token-audience="${SERVICE_URL}" >/dev/null
else
  "${GCLOUD_BIN}" scheduler jobs create http "${JOB_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${SCHEDULE}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${SERVICE_URL}/cron" \
    --http-method=POST \
    --headers="Content-Type=application/json,X-Cron-Secret=${CRON_SECRET_VALUE}" \
    --message-body='{"mode":"send"}' \
    --oidc-service-account-email="${INVOKER_SA}" \
    --oidc-token-audience="${SERVICE_URL}" >/dev/null
fi

echo "Cloud Scheduler job configured: ${JOB_NAME}"
echo "Schedule: ${SCHEDULE} ${TIME_ZONE}"
echo "Target: ${SERVICE_URL}/cron"
