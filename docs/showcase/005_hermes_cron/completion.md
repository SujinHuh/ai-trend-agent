# Hermes Cron Completion

## Summary

Task 005 connects the v2 daily digest flow to a Hermes-compatible cron execution path.

The implementation adds a local cron worker, audit log, idempotency guard, HTTP `POST /cron` endpoint, and CLI commands. It reuses Task 002 ingestion, Task 003 ranking, and Task 004 Slack delivery instead of shelling out to existing commands.

The direction remains: Hermes triggers `/cron` on schedule, the worker builds the AI trend digest, and Slack receives the daily AI trend notification.

## What Was Built

- `cron_runs` SQLite audit table
- cron run store methods
- KST report date default
- `runHermesCron` worker
- `sendSlackDigest` reusable Slack delivery service
- cron idempotency key: `hermes-cron:daily-digest:YYYY-MM-DD`
- active send claim guard for concurrent `/cron` calls
- HTTP `POST /cron` endpoint
- required production `CRON_SECRET` bearer auth
- minimized HTTP response output
- request body size and content-type guard
- default-disabled HTTP force bypass
- project-scoped file paths for DB, config, cache, and wiki index output
- local `cron:run` and `cron:serve` scripts
- dry-run mode that never sends Slack

## Safety Rules

- default cron mode is `dry_run`.
- send mode must be explicit.
- production `/cron` fails closed when `CRON_SECRET` is missing.
- `SLACK_WEBHOOK_URL` is required only for send mode.
- missing webhook is recorded as failed cron run before network.
- successful send runs block duplicate sends by idempotency key.
- active send claim collisions return safe failed results, not raw SQLite errors.
- failed send runs remain retryable.
- dry-runs do not block later sends.
- HTTP `force` is ignored unless `CRON_ALLOW_FORCE=true`.
- runtime file paths are project-scoped by default; external paths require explicit local-test override.
- Task 004 payload duplicate guard remains active.

## Validation

```text
git diff --check       passed
npm run typecheck      passed
npm test               passed

17 full-suite test files passed
108 full-suite tests passed
7 related test files passed
67 related tests passed
```

CLI smoke:

```text
npm run cron:run -- --date=2026-08-02 --dry-run
npm run cron:run -- --date=2026-08-02 --send
```

`cron:run --dry-run` passed without Slack webhook. `cron:run --send` failed safely before network because `SLACK_WEBHOOK_URL` is intentionally missing.

## What Was Intentionally Excluded

- GCP Cloud Run deployment
- Cloud Scheduler setup
- Secret Manager integration
- real Hermes account schedule setup
- production alerting
- Slack Bot API
- Slack interactivity
- Cloud Run IAM/OIDC request authentication
- Secret rotation and production rate limiting

## Files To Inspect

- `src/cron/run-hermes-cron.ts`
- `src/cron/cron-http-server.ts`
- `src/slack/send-slack-digest.ts`
- `src/db/schema.ts`
- `src/db/llm-wiki-store.ts`
- `src/domain/types.ts`
- `src/cli.ts`
- `tests/cron-worker.test.ts`
- `tests/cron-http.test.ts`
- `tests/cli.test.ts`
- `tests/schema.test.ts`
- `tests/llm-wiki-store.test.ts`

## What This Enables Next

The next implementation step is:

```text
6. GCP 배포
```

Task 006 can deploy the cron endpoint/worker to Cloud Run, move secrets to Secret Manager, and connect production scheduling.

Task 006 should proceed only with these required controls:

1. Cloud Run worker deployment with no broad filesystem mounts.
2. Secret Manager for `SLACK_WEBHOOK_URL` and `CRON_SECRET`.
3. Cloud Scheduler or Hermes invocation protected by IAM/OIDC or `CRON_SECRET`.
4. Hermes deployed separately with low privilege and no Slack webhook access.
5. production logs checked for secret redaction and minimized response output.

Security direction for Task 006:

- run Hermes agent in its own Docker/Cloud Run container.
- keep Hermes low privilege: worker endpoint URL and `CRON_SECRET` only.
- keep Slack webhook, DB write permissions, and Secret Manager access in the AI Trend worker.
- let Hermes handle learning, judgment, policy memory, and execution requests.
- do not store raw secrets, full webhook URLs, or sensitive logs in Hermes learning memory.
- keep the scheduled `07:00 KST` AI trend Slack digest as the primary product behavior.
