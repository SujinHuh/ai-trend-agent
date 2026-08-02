# Task 006 Validation Report - GCP Deployment

## Current Status

Task 006 deployment assets are implemented and the first real GCP deployment path has been validated.

## Initial Security Review Targets

Critical areas to validate:

1. Docker image excludes local data, cache, env files, and git metadata.
2. Worker runs in production mode with required cron secret.
3. Secrets are injected from Secret Manager.
4. Worker and Hermes/invoker service accounts are separate.
5. Hermes/invoker cannot access Slack webhook or broad project permissions.
6. `/cron` invocation is protected by IAM/OIDC, `CRON_SECRET`, or both.
7. Schedule is fixed to `07:00 Asia/Seoul`.
8. Deployment scripts fail fast when required inputs are missing.

## Sub-agent Document Review Findings

Findings received and reflected:

1. Task 006 must deploy the existing Task 005 `POST /cron` worker, not redesign ingestion, ranking, or Slack.
2. Scheduler semantics must be exact: `0 7 * * *`, timezone `Asia/Seoul`, `POST /cron`, body `{"mode":"send"}`.
3. Preferred auth path is Cloud Run IAM/OIDC with unauthenticated access disabled.
4. `CRON_SECRET` should remain enabled as defense in depth because the worker fails closed in production.
5. Worker and Hermes/Scheduler must use separate service accounts.
6. Worker may read `SLACK_WEBHOOK_URL` and `CRON_SECRET`; Scheduler may carry only the defense-in-depth `X-Cron-Secret` header and must not receive the Slack webhook or broad permissions.
7. No broad `Editor`, `Owner`, wildcard secret access, broad mounts, or `AI_TREND_ALLOW_EXTERNAL_PATHS=true` in production.
8. SQLite in Cloud Run is ephemeral and acceptable only for first deployment smoke; durable storage migration is a follow-up unless the user chooses it now.
9. Cloud Logging review must check redaction and avoid env dumps.
10. Completion report must clearly show what is implemented and what still requires real GCP values.

Applied fixes:

1. Added `ops/gcp/cloud-run-security-contract.md`.
2. Added private Cloud Run deployment script with `--no-allow-unauthenticated`.
3. Added separate worker and invoker service accounts.
4. Added Secret Manager setup script.
5. Added Cloud Scheduler script with OIDC plus bearer header.
6. Added `.dockerignore` and tests that exclude local/sensitive paths.
7. Added Docker runtime smoke and deployment asset tests.

## Validation Commands

Passed locally:

```text
npm run typecheck
npm run build
npm test -- tests/deployment-assets.test.ts tests/cron-http.test.ts tests/cron-worker.test.ts tests/cli.test.ts
bash -n scripts/cloud-run/*.sh
node dist/src/cli.js cron:run --date=2026-08-02 --dry-run
DOCKER_API_VERSION=1.41 docker build -t ai-trend-agent:task006 .
DOCKER_API_VERSION=1.41 docker run --rm ai-trend-agent:task006 node -e "..."
DOCKER_API_VERSION=1.41 docker run --rm ai-trend-agent:task006 node dist/src/cli.js cron:run --date=2026-08-02 --dry-run
```

Results:

- typecheck passed.
- production build passed.
- related tests passed: 4 files, 34 tests.
- deployment asset tests passed: 6 tests.
- shell syntax checks passed.
- compiled JS cron dry-run passed.
- Docker image build passed after adding build-stage Python/native build tools for `better-sqlite3`.
- Docker image content check confirmed `.env`, `.git`, `tests`, and `docs/showcase` are not present.
- Docker image cron dry-run passed.
- full suite passed: 18 files, 116 tests.
- git diff check passed.

## Real Deployment Progress

Step 1 Secret Manager:

- `secretmanager.googleapis.com` enabled in project `project-7296a491-98d3-4b50-abe`.
- `ai-trend-cron-secret` created.
- `ai-trend-slack-webhook-url` created.
- Initial Slack webhook value was accidentally pasted into chat, so it was treated as compromised.
- Slack webhook was rotated.
- `ai-trend-slack-webhook-url` versions 1 and 2 were destroyed.
- `ai-trend-slack-webhook-url` version 3 is enabled.
- Step 1 is accepted as complete after rotation.

Step 2 Cloud Run worker:

- Project: `project-7296a491-98d3-4b50-abe`.
- Region: `asia-northeast3`.
- Artifact Registry repository: `ai-trend`.
- Image: `asia-northeast3-docker.pkg.dev/project-7296a491-98d3-4b50-abe/ai-trend/ai-trend-worker:latest`.
- Service: `ai-trend-worker`.
- Service URL: `https://ai-trend-worker-edjrjtiwga-du.a.run.app`.
- Runtime service account: `ai-trend-worker-runtime@project-7296a491-98d3-4b50-abe.iam.gserviceaccount.com`.
- Service is private: unauthenticated access is not allowed.
- Secret env vars are Secret Manager references, not literal values.

Step 3 Cloud Scheduler:

- Job: `ai-trend-daily-digest`.
- Schedule: `0 7 * * *`.
- Timezone: `Asia/Seoul`.
- Target: `POST https://ai-trend-worker-edjrjtiwga-du.a.run.app/cron`.
- Body: `{"mode":"send"}`.
- OIDC service account: `ai-trend-cron-invoker@project-7296a491-98d3-4b50-abe.iam.gserviceaccount.com`.
- Scheduler script was patched to suppress default output because `gcloud scheduler` can print secret headers.

Step 4 smoke:

- Direct unauthenticated `/cron` request returned `403`.
- Cloud Run IAM policy contains only `roles/run.invoker` for the Scheduler invoker service account.
- Scheduler manual run reached Cloud Run and logged `POST 200`.
- Cloud Run logs inspected did not show Slack webhook or bearer-style secret values in the checked entries.
- Sub-agent post-deployment review found no critical issues; follow-up fixes tightened smoke status checks, required a real ID token for direct authenticated smoke, and corrected the Scheduler secret-boundary wording.
- Slack receipt was confirmed by the user. The observed `2026-08-020 Top AI Signals` rendering is `2026-08-02` plus `0 Top AI Signals`, meaning the scheduled digest sent successfully with zero current candidates.

## Remaining Follow-ups

- Keep Cloud Scheduler as first invoker; add Hermes Docker/Cloud Run as a later low-privilege invoker.
- Migrate ephemeral SQLite/cache state to durable storage in a later task if persistent history is required.
- Continue Task 007 social allow-list expansion only after this deployment handoff is accepted.
