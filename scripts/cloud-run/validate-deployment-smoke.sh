#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-}"
PROJECT_ID="${GCP_PROJECT_ID:-}"
CRON_SECRET_NAME="${CRON_SECRET_NAME:-ai-trend-cron-secret}"
CRON_SECRET_VALUE="${CRON_SECRET_VALUE:-}"
ID_TOKEN="${ID_TOKEN:-}"
REQUIRE_DIRECT_AUTH_SMOKE="${REQUIRE_DIRECT_AUTH_SMOKE:-false}"
GCLOUD_BIN="${GCLOUD_BIN:-/usr/bin/gcloud}"

if [[ -z "${BASE_URL}" ]]; then
  echo "BASE_URL is required, for example https://ai-trend-worker-xxxxx.a.run.app" >&2
  exit 1
fi

if [[ "${REQUIRE_DIRECT_AUTH_SMOKE}" == "true" && -z "${CRON_SECRET_VALUE}" ]]; then
  if [[ -z "${PROJECT_ID}" ]]; then
    echo "CRON_SECRET_VALUE or GCP_PROJECT_ID is required; the secret will be used but not printed" >&2
    exit 1
  fi
  CRON_SECRET_VALUE="$("${GCLOUD_BIN}" secrets versions access latest --secret="${CRON_SECRET_NAME}" --project="${PROJECT_ID}")"
fi

unauth_status="$(curl -sS -o /tmp/ai-trend-cron-unauth.json -w '%{http_code}' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"mode":"dry_run"}' \
  "${BASE_URL}/cron" || true)"

if [[ "${unauth_status}" != "401" && "${unauth_status}" != "403" ]]; then
  echo "Expected unauthenticated /cron request to return 401 or 403, got ${unauth_status}" >&2
  exit 1
fi

if [[ "${REQUIRE_DIRECT_AUTH_SMOKE}" != "true" ]]; then
  echo "Deployment smoke passed unauthenticated block with status ${unauth_status}; direct authenticated smoke skipped for private Cloud Run"
  echo "Use Cloud Scheduler manual run to validate the OIDC invoker path"
  exit 0
fi

if [[ -z "${ID_TOKEN}" ]]; then
  echo "ID_TOKEN is required when REQUIRE_DIRECT_AUTH_SMOKE=true; do not use CRON_SECRET as a bearer token" >&2
  exit 1
fi

auth_headers=(-H 'Content-Type: application/json' -H "X-Cron-Secret: ${CRON_SECRET_VALUE}")
auth_headers+=(-H "Authorization: Bearer ${ID_TOKEN}")

auth_status="$(curl -sS -o /tmp/ai-trend-cron-auth.json -w '%{http_code}' \
  -X POST \
  "${auth_headers[@]}" \
  --data '{"mode":"dry_run"}' \
  "${BASE_URL}/cron")"

if [[ "${auth_status}" != "200" && "${auth_status}" != "409" ]]; then
  echo "Expected authenticated /cron dry-run to return 200 or controlled 409, got ${auth_status}" >&2
  exit 1
fi

if grep -E 'cronRun|idempotencyKey|hooks\.slack\.com|Bearer [A-Za-z0-9._~+/=-]+' /tmp/ai-trend-cron-auth.json >/dev/null; then
  echo "Smoke response exposed internal fields or secret-like values" >&2
  exit 1
fi

echo "Deployment smoke passed with authenticated status ${auth_status}; unauthenticated status ${unauth_status}"
