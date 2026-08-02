# Task 005 Requirements - Hermes Cron

## Purpose

Task 005 connects the existing ingestion, ranking, and Slack manual delivery primitives to a scheduled Hermes `/cron` execution path.

This task makes the daily digest flow callable as a cron-safe worker. It does not deploy to GCP, create a real Hermes account schedule, or move secrets into Secret Manager.

The retained product direction is: Hermes triggers `/cron` at a scheduled time, the worker collects and ranks AI trend signals, and Slack receives the daily AI trend digest.

## Inputs

- Task 002 source registry and cache-aware ingestion
- Task 003 digest candidate synthesis and ranking
- Task 004 Slack renderer, sender, and delivery attempt log
- `SLACK_WEBHOOK_URL` from environment when scheduled send is enabled
- `CRON_SECRET` for HTTP endpoint calls in production or when `CRON_REQUIRE_SECRET=true`

## Security Direction

- Hermes agent should run in a separate Docker or Cloud Run container.
- Hermes owns learning, judgment, policy memory, and worker invocation.
- Hermes should hold only `CRON_SECRET` or a limited worker invocation token.
- AI Trend worker owns Slack webhook use, DB write permission, ingestion, ranking, and Slack send side effects.
- Hermes learning memory must not store raw secrets, full webhook URLs, sensitive logs, or broad cloud credentials.
- The scheduled AI trend notification remains a worker side effect, not a direct Hermes side effect.

## Required Outputs

1. cron run domain types
2. cron run persistence table
3. idempotency key for scheduled daily runs
4. worker function that performs ingestion, synthesis, Slack send, and audit logging
5. HTTP `/cron` endpoint for Hermes-compatible calls
6. CLI command for local cron simulation
7. dry-run mode that never sends Slack
8. cron-level duplicate prevention
9. step-level failure reporting
10. tests and validation docs

## Runtime Requirements

- Default schedule target is `07:00 Asia/Seoul`.
- The scheduled product behavior is a daily AI trend Slack digest, not a generic cron ping.
- The report date must be computed in `Asia/Seoul` unless explicitly passed.
- The endpoint must accept only `POST /cron`.
- If `CRON_SECRET` is set, requests must include `Authorization: Bearer <CRON_SECRET>`.
- In production or when `CRON_REQUIRE_SECRET=true`, the endpoint must fail closed if `CRON_SECRET` is missing.
- The endpoint must accept only JSON request bodies and must limit request size.
- Missing `SLACK_WEBHOOK_URL` must fail before network when send mode is enabled.
- Dry-run mode must execute ingestion/ranking/rendering but must not send Slack.
- Dry-run mode must not create a successful send-blocking cron run.
- Send mode must persist a cron run before Slack network calls so running/failed attempts are auditable.
- All outputs must avoid logging full webhook URLs or secrets.

## Idempotency Requirements

- Cron runs must use an idempotency key.
- Default key format: `hermes-cron:daily-digest:YYYY-MM-DD`.
- A successful run for the same key must block another scheduled send.
- Concurrent requests with the same idempotency key must be guarded by a database-level unique or transactional claim, not only an in-memory check.
- An explicit force option may bypass the cron run guard for local/manual recovery.
- HTTP `force` must be disabled by default and allowed only when `CRON_ALLOW_FORCE=true`.
- Failed runs must be logged but must not block retry.
- Task 004 duplicate-send guard remains active as a second safety layer.

## Cron Run Log

Record each cron run with:

- id
- idempotency key
- report date
- mode: `dry_run` or `send`
- status: `running`, `success`, or `failed`
- started at
- finished at
- step name
- candidate count
- Slack attempt id when available
- error message when available

The stored error message must be redacted and length-limited before persistence or HTTP response output.

## HTTP Contract

- `POST /cron` is the only accepted method.
- Request body may include `mode`, `date`, `limit`, and `force`.
- Default mode is `dry_run`; send mode must be explicit.
- Unauthorized requests return 401 when `CRON_SECRET` is configured.
- Missing `CRON_SECRET` returns 503 when production auth is required.
- Oversized bodies return 413.
- Unsupported media types return 415.
- Unsupported methods return 405.
- Successful dry-runs and sends return minimized JSON with run id, `reportDate`, `mode`, `status`, `candidateCount`, and optional Slack attempt id.
- HTTP responses must not include full `cronRun` rows, idempotency keys, raw webhook URLs, bearer tokens, or broad internal error strings.
- Duplicate successful sends return a non-2xx JSON error before Slack network calls.

## Filesystem Protection

- Runtime file inputs must stay inside the project directory by default.
- Protected inputs include SQLite DB path, source config path, source cache root, and wiki index output path.
- External paths require explicit `AI_TREND_ALLOW_EXTERNAL_PATHS=true` and are intended only for isolated local tests.
- Cache path segments derived from `reportDate` and `sourceId` must reject traversal characters.
- The docs server must serve only files under `docs/`.

## Scope Boundary

Excluded:

- GCP Cloud Run deployment
- Cloud Scheduler setup
- Secret Manager integration
- production alerting
- Slack Bot API
- Slack interactivity
- multi-user personalization
- real Hermes account configuration

## Acceptance Criteria

- local CLI can run cron dry-run without Slack webhook.
- local CLI send mode reuses Task 004 Slack send path and audit log.
- HTTP `/cron` supports dry-run and send mode.
- cron idempotency blocks duplicate successful scheduled sends.
- failed cron runs are persisted and can be retried.
- endpoint auth is enforced when `CRON_SECRET` is configured.
- concurrent duplicate send attempts cannot both pass the cron guard.
- dry-run can be repeated without blocking a later send for the same report date.
- tests do not call real Slack or external networks.
- tests cover required cron auth, minimized HTTP response, request body limit, active claim collision handling, and filesystem path scoping.
- validation report and completion md/html are created.
