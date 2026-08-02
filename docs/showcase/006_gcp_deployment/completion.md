# GCP Deployment Completion

## Summary

Task 006 prepares and deploys the Task 005 Hermes cron worker on GCP.

The deployment now has real Secret Manager secrets, a private Cloud Run worker, and a Cloud Scheduler job for daily Slack delivery. Secret values are not stored in the repo.

The direction remains: Hermes or Cloud Scheduler invokes `POST /cron` every day at `07:00 KST`, the AI Trend worker performs ingestion/ranking/storage/Slack delivery, and secrets stay on the worker side.

## What Was Built

- production TypeScript build: `npm run build`
- production cron server start command: `npm run start:cron:serve`
- `Dockerfile` for AI Trend worker
- `.dockerignore` excluding local data, cache, env files, git metadata, tests, and showcase artifacts
- Secret Manager setup script
- Cloud Run worker deployment script
- Cloud Scheduler protected invocation script
- deployment smoke script
- Cloud Run security contract
- deployment asset tests
- real private Cloud Run worker in `asia-northeast3`
- real Cloud Scheduler job at `07:00 KST`

## Safety Rules

- Cloud Run worker uses `NODE_ENV=production`.
- Cloud Run worker uses `CRON_REQUIRE_SECRET=true`.
- Cloud Run deploy script uses `--no-allow-unauthenticated`.
- `CRON_ALLOW_FORCE` is not enabled.
- Worker and invoker service accounts are separate.
- Worker may access `SLACK_WEBHOOK_URL` and `CRON_SECRET` through Secret Manager.
- Hermes/Scheduler invoker only receives Cloud Run invocation authority and optional `CRON_SECRET`.
- Docker image does not include `.env`, `.git`, tests, or showcase artifacts.
- Do not enable `AI_TREND_ALLOW_EXTERNAL_PATHS` in production.
- SQLite/cache inside Cloud Run are ephemeral until Cloud SQL/Firestore/Cloud Storage are implemented.

## Validation

```text
npm run typecheck      passed
npm run build          passed
npm test               passed
git diff --check       passed

18 full-suite test files passed
116 full-suite tests passed
```

Deployment-specific validation:

```text
bash -n scripts/cloud-run/*.sh                         passed
node dist/src/cli.js cron:run --date=2026-08-02 --dry-run passed
DOCKER_API_VERSION=1.41 docker build -t ai-trend-agent:task006 . passed
Docker image content check passed
Docker image cron dry-run passed
```

Docker image content check confirmed these are not present in `/app`:

```text
.env false
.git false
tests false
docs/showcase false
```

Real deployment validation:

```text
Cloud Run service deployed: ai-trend-worker
Service URL: https://ai-trend-worker-edjrjtiwga-du.a.run.app
Cloud Run invoker: ai-trend-cron-invoker service account only
Cloud Scheduler job: ai-trend-daily-digest, 0 7 * * *, Asia/Seoul
Unauthenticated /cron request: 403
Scheduler manual invocation: Cloud Run POST 200
```

## What Was Intentionally Excluded

- Cloud SQL PostgreSQL or Firestore migration
- Cloud Storage raw snapshot migration
- full Hermes learning service deployment
- automated secret rotation
- multi-region/high-availability deployment
- Task 007 social allow-list expansion
- web news UI

## Files To Inspect

- `Dockerfile`
- `.dockerignore`
- `tsconfig.build.json`
- `package.json`
- `scripts/cloud-run/setup-secrets.sh`
- `scripts/cloud-run/deploy-worker.sh`
- `scripts/cloud-run/create-scheduler-job.sh`
- `scripts/cloud-run/validate-deployment-smoke.sh`
- `ops/gcp/cloud-run-security-contract.md`
- `tests/deployment-assets.test.ts`
- `docs/task/006_gcp_deployment/validation_report.md`

## What This Enables Next

Task 006 is deployed with Cloud Scheduler as the first invoker.

The next v2 implementation task after deployment handoff is:

```text
7. 소셜 allow-list 확장
```

Task 007 should add limited social-signal collection without weakening the official-source confirmation rules.
