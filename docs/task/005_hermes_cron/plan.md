# Task 005 Plan - Hermes Cron

## Goal

Create a cron-safe execution path that Hermes can call to run the daily AI trend digest flow at `07:00 Asia/Seoul`.

## Execution Plan

1. Confirm Task 005 starts from Task 004 dependent branch.
2. Create task docs and numbered step docs.
3. Add cron run domain types.
4. Add cron run schema and store methods.
5. Extract/reuse scheduled digest worker flow.
6. Add cron idempotency guard.
7. Add HTTP `/cron` endpoint.
8. Add local `cron:run` CLI.
9. Add env examples for `CRON_SECRET` and cron runtime settings.
10. Add tests for dry-run, send mode, auth, idempotency, and failures.
11. Run validation.
12. Create completion MD/HTML and PR body draft.

## Default Decisions

- local implementation comes first; GCP deployment stays Task 006.
- default mode is `dry_run` unless `--send` or request mode `send` is explicit.
- endpoint method is `POST /cron`.
- `CRON_SECRET` is optional only for local development; production or `CRON_REQUIRE_SECRET=true` fails closed when it is missing.
- HTTP response output is allowlisted and redacted.
- HTTP `force` is disabled unless `CRON_ALLOW_FORCE=true`.
- cron idempotency is separate from Task 004 payload duplicate guard.
- report date defaults to current KST date.
- tests use injected sender and local HTTP calls only.

## Validation

```text
git diff --check
npm run typecheck
npm test
npm run cron:run -- --date=YYYY-MM-DD --dry-run
npm run cron:run -- --date=YYYY-MM-DD --send
```

Real Slack sending requires user-provided `SLACK_WEBHOOK_URL`. Automated validation must use mock sender or dry-run mode.
