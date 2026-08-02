# Cloud Run Security Contract

## Services

AI Trend worker:

- Runs the Task 005 `/cron` worker.
- Owns ingestion, ranking, LLM Wiki writes, raw snapshot writes, and Slack send side effects.
- May read `SLACK_WEBHOOK_URL` and `CRON_SECRET` from Secret Manager.

Hermes or Scheduler invoker:

- Triggers the worker.
- May hold only invocation authority and optionally `CRON_SECRET`.
- Must not read Slack webhook, DB write credentials, or broad GCP credentials.

## Preferred Auth

Use Cloud Run IAM/OIDC with unauthenticated access disabled.

`CRON_SECRET` remains enabled as defense in depth:

- `NODE_ENV=production`
- `CRON_REQUIRE_SECRET=true`
- `CRON_ALLOW_FORCE` unset

When OIDC is used, the HTTP `Authorization` header contains the OIDC token. Send `CRON_SECRET` through `X-Cron-Secret` instead of replacing the OIDC bearer token.

## Service Accounts

Worker service account:

- `roles/secretmanager.secretAccessor` only on required secrets.
- storage/database permissions only when those backends are provisioned.
- no `Editor`, `Owner`, broad secret access, or project-wide admin.

Invoker service account:

- `roles/run.invoker` only on the worker Cloud Run service.
- no Secret Manager read access.
- no Slack webhook access.

## Filesystem

- Do not mount host folders.
- Do not set `AI_TREND_ALLOW_EXTERNAL_PATHS=true` in production.
- Keep runtime DB/config/cache/wiki paths inside the container workdir.
- Treat Cloud Run local SQLite and cache as ephemeral unless Cloud SQL/Firestore/Cloud Storage is implemented.

## Logging

- Do not print env dumps.
- Do not print Slack webhook values or bearer tokens.
- Review Cloud Logging after deploy for redaction behavior.
