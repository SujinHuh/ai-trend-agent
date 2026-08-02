# Task 005 Validation Report - Hermes Cron

## Current Status

Task 005 is complete after security re-review. It is ready for Task 006 deployment hardening, not yet a production security guarantee.

## Document Review

Sub-agent document review found:

1. concurrent duplicate `/cron` requests needed a DB-backed active claim, not only a preflight lookup.
2. dry-run success must not block a later send for the same report date.
3. HTTP request/response contract needed method, auth, default mode, and non-2xx duplicate behavior.
4. persisted and returned cron errors needed redaction and length limits.
5. Task 005 should reuse internal Task 004 send primitives, not shell out to `slack:send`.

Fixes applied:

1. `cron_runs` has an active send claim unique index.
2. dry-run and send modes are separated; send idempotency only checks successful send runs.
3. `POST /cron` returns JSON, 401 for auth failure, 405 for unsupported method, and 409 for failed/duplicate runs.
4. cron errors are sanitized and capped before persistence.
5. Slack digest send logic was extracted to `sendSlackDigest`.

## Security Re-review Findings

Sub-agent security review found the following risks, sorted by severity.

High:

1. `/cron` authentication was optional when `CRON_SECRET` was missing.
2. `/cron` HTTP responses exposed too much internal run detail.

Medium-high:

3. active send claim collisions could escape as raw SQLite unique constraint errors.

Medium:

4. HTTP request bodies had no size limit.
5. HTTP clients could set `force: true` by default.
6. non-cron Slack sends still need a stronger DB-level in-flight claim if they become externally callable.
7. `cron_runs` schema drift validation was weaker than Slack delivery validation.

Low:

8. security failure tests needed better coverage.

Applied hardening:

1. `CRON_SECRET` is required when `CRON_REQUIRE_SECRET=true` or `NODE_ENV=production`.
2. `/cron` now returns an allowlisted response only: run id, report date, mode, status, candidate count, Slack attempt id, and redacted error.
3. raw `cronRun` rows and idempotency keys are no longer returned from the HTTP endpoint.
4. active send claim collisions return a safe failed result before ingestion or Slack network calls.
5. `/cron` enforces `Content-Type: application/json` when a body content type is provided.
6. `/cron` limits request bodies to 8 KiB.
7. HTTP `force: true` is ignored unless `CRON_ALLOW_FORCE=true`.
8. cron worker and Slack sender share the same secret redaction helper, including encoded Slack webhook URLs, bearer tokens, and common token/query forms.
9. `cron_runs` schema drift validation now checks required columns, enum constraints, and indexes.
10. CLI path inputs are scoped to the project directory by default so the app cannot read/write unrelated folders unless `AI_TREND_ALLOW_EXTERNAL_PATHS=true` is explicitly set for isolated local tests.
11. source cache path segments are validated so `sourceId` and `reportDate` cannot be used for path traversal.
12. docs server path containment now uses path-relative containment, not string-prefix matching.

## Implementation Review

Implementation review passed locally:

- cron run domain types added.
- `cron_runs` schema and store methods added.
- `runHermesCron` worker added.
- `POST /cron` HTTP server added.
- `cron:run` and `cron:serve` scripts added.
- Task 004 Slack send path reused through `sendSlackDigest`.

## Validation Commands

Passed:

```text
git diff --check
npm run typecheck
npm test
npm run cron:run -- --date=YYYY-MM-DD --dry-run
npm run cron:run -- --date=YYYY-MM-DD --send
```

Result:

```text
typecheck passed
full test suite passed: 17 files, 108 tests
related security/Task 005 tests passed: 7 files, 67 tests
git diff --check passed
cron:run dry-run passed without Slack webhook
cron:run send failed safely before network because SLACK_WEBHOOK_URL is missing
```

Task-specific checks:

- KST report date default is tested.
- dry-run works without Slack webhook.
- send mode works with injected Slack sender.
- missing webhook is persisted as failed cron run.
- duplicate successful send run is blocked before Slack.
- active concurrent send claim is DB-backed.
- dry-run repeat does not block later send.
- HTTP method and auth are tested.
- production-required cron secret is tested.
- HTTP response minimization is tested.
- request body size limit is tested.
- active send claim collision handling is tested.
- external path protection and cache segment validation are tested.
- tests do not call real Slack.

## Known Scope Boundaries

- No GCP deployment.
- No real Hermes account schedule setup.
- No Secret Manager integration.
- No real Slack webhook committed.
- No final Cloud Run IAM/OIDC boundary yet.
- No Secret Manager secret rotation policy yet.
- Non-cron Slack send remains local CLI only; if exposed remotely, it needs an in-flight DB claim similar to cron.
