# Task 006 Plan - GCP Deployment

## Goal

Prepare the Task 005 cron worker for secure GCP operation.

## Execution Plan

1. Create task docs and status tracking.
2. Define the GCP deployment security contract.
3. Add production build and runtime scripts.
4. Add Dockerfile and `.dockerignore`.
5. Add Secret Manager setup script.
6. Add Cloud Run worker deployment script.
7. Add Cloud Scheduler/Hermes invocation guidance.
8. Add deployment smoke validation.
9. Run local validation.
10. Create completion md/html and hand off remaining production inputs.

## Default Decisions

- Worker service name: `ai-trend-worker`
- Invoker/Hermes service account name: `ai-trend-cron-invoker`
- Worker service account name: `ai-trend-worker-runtime`
- Region default: `asia-northeast3`
- Schedule: `0 7 * * *`
- Schedule timezone: `Asia/Seoul`
- Runtime port: Cloud Run `$PORT`, default local `3000`
- Production mode: `NODE_ENV=production`, `CRON_REQUIRE_SECRET=true`
- HTTP force bypass: disabled unless explicitly setting `CRON_ALLOW_FORCE=true`

## Validation

```text
npm run typecheck
npm run build
npm test
docker build -t ai-trend-agent:task006 .
scripts/cloud-run/validate-deployment-smoke.sh
git diff --check
```

Real deployment requires:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- actual `SLACK_WEBHOOK_URL`
- generated `CRON_SECRET`
- authenticated `gcloud`
