#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
SLACK_WEBHOOK_URL_VALUE="${SLACK_WEBHOOK_URL_VALUE:-}"
CRON_SECRET_VALUE="${CRON_SECRET_VALUE:-}"
SLACK_SECRET_NAME="${SLACK_SECRET_NAME:-ai-trend-slack-webhook-url}"
CRON_SECRET_NAME="${CRON_SECRET_NAME:-ai-trend-cron-secret}"
GCLOUD_BIN="${GCLOUD_BIN:-/usr/bin/gcloud}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

if [[ -z "${SLACK_WEBHOOK_URL_VALUE}" ]]; then
  echo "SLACK_WEBHOOK_URL_VALUE is required and will be written to Secret Manager without printing it" >&2
  exit 1
fi

if [[ -z "${CRON_SECRET_VALUE}" ]]; then
  echo "CRON_SECRET_VALUE is required and will be written to Secret Manager without printing it" >&2
  exit 1
fi

if [[ ! -x "${GCLOUD_BIN}" ]]; then
  echo "GCLOUD_BIN is not executable: ${GCLOUD_BIN}" >&2
  exit 1
fi

ensure_secret() {
  local secret_name="$1"
  if ! "${GCLOUD_BIN}" secrets describe "${secret_name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    "${GCLOUD_BIN}" secrets create "${secret_name}" \
      --project="${PROJECT_ID}" \
      --replication-policy="automatic"
  fi
}

ensure_secret "${SLACK_SECRET_NAME}"
printf '%s' "${SLACK_WEBHOOK_URL_VALUE}" | "${GCLOUD_BIN}" secrets versions add "${SLACK_SECRET_NAME}" \
  --project="${PROJECT_ID}" \
  --data-file=-

ensure_secret "${CRON_SECRET_NAME}"
printf '%s' "${CRON_SECRET_VALUE}" | "${GCLOUD_BIN}" secrets versions add "${CRON_SECRET_NAME}" \
  --project="${PROJECT_ID}" \
  --data-file=-

echo "Secret Manager setup complete for project ${PROJECT_ID}: ${SLACK_SECRET_NAME}, ${CRON_SECRET_NAME}"
