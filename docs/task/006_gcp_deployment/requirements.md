# Task 006 Requirements - GCP Deployment

## Purpose

Task 006 moves the verified Task 005 cron worker toward a production GCP runtime with explicit security boundaries.

The primary goal is information protection:

- keep AI Trend worker as the only secret-bearing side-effect service.
- keep Hermes isolated and low privilege.
- keep Slack webhook and strong GCP permissions out of Hermes.
- make `/cron` callable on schedule without exposing unrelated folders or raw secrets.

## Inputs

- Task 005 Hermes cron worker and HTTP `/cron` endpoint
- Task 005 security handoff
- v2 GCP requirements in `docs/requirements-v2-llm-wiki-hermes.md`
- local SQLite default for MVP runtime
- user-confirmed GCP project, region, and Secret Manager values for real deployment

## Required Outputs

1. Task 006 planning docs and numbered step docs.
2. Production Dockerfile for AI Trend worker.
3. `.dockerignore` that excludes repo data, cache, docs artifacts, local env, and git metadata.
4. Cloud Run deployment script for the worker.
5. Secret Manager setup script for `SLACK_WEBHOOK_URL` and `CRON_SECRET`.
6. Cloud Scheduler or Hermes invocation guidance for `07:00 Asia/Seoul`.
7. IAM/service-account split between worker and invoker/Hermes.
8. Runtime environment contract.
9. Deployment smoke/verification script.
10. Validation report and completion md/html.

## Security Requirements

- Worker Cloud Run service must run with `NODE_ENV=production` and `CRON_REQUIRE_SECRET=true`.
- Worker must receive `SLACK_WEBHOOK_URL` and `CRON_SECRET` from Secret Manager, not plain committed files.
- Worker service account must be least privilege.
- Hermes/invoker service account must not have Slack webhook, DB write, or broad project admin permission.
- `/cron` must be protected by Cloud Run IAM/OIDC with unauthenticated access disabled.
- `CRON_SECRET` remains enabled as defense in depth for the worker.
- Docker image must not include `.env`, SQLite data, source cache, git metadata, or local docs server artifacts.
- Cloud Run must not mount unrelated host folders.
- Runtime file paths must stay in the container/project workdir by default.
- `AI_TREND_ALLOW_EXTERNAL_PATHS` must not be enabled in production.
- Logs and HTTP responses must not expose raw webhook URLs, bearer tokens, or broad internal state.

## Schedule Requirements

- Default schedule is daily `07:00 Asia/Seoul`.
- Cloud Scheduler timezone must be `Asia/Seoul` if Cloud Scheduler is used.
- The schedule should call `POST /cron` with JSON body:

```json
{
  "mode": "send"
}
```

## Storage Decision

Task 006 keeps the local SQLite worker storage for the first deployable worker image unless the user explicitly chooses Cloud SQL or Firestore during deployment.

In Cloud Run, local SQLite and source cache are ephemeral. This is acceptable for image and endpoint smoke validation, but it is not durable production storage.

Cloud SQL PostgreSQL or Firestore migration remains a documented follow-up because it changes the storage implementation and requires project-specific provisioning.

## Out Of Scope

- Real Slack webhook value entry by the agent.
- Agent-side handling of raw Slack webhook or cron secret values outside Secret Manager.
- Cloud SQL PostgreSQL or Firestore migration implementation.
- Full Hermes learning service implementation.
- Slack Bot API and Slack interactivity.
- Web news UI.

## Acceptance Criteria

- `npm run build` produces runnable JavaScript in `dist/src`.
- Dockerfile builds a worker image that starts `cron:serve`.
- `.dockerignore` excludes sensitive/local-only files.
- Deployment scripts fail fast when required variables are missing.
- Scripts use Secret Manager references for secrets.
- Scripts create or reference least-privilege service accounts.
- Smoke script can check `/cron` auth and minimized output.
- Validation report records local verification, real Cloud Run/Scheduler deployment, and remaining follow-ups.
