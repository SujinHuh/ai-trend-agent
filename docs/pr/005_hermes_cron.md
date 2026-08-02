# PR: Task 005 Hermes Cron

## Summary

- add cron run audit table and store methods
- add reusable Slack digest send service
- add `runHermesCron` worker with dry-run/send modes
- add cron idempotency and active send claim guard
- add HTTP `POST /cron` endpoint with optional bearer auth
- add `cron:run` and `cron:serve` scripts
- add focused cron worker, HTTP, CLI, schema, and store tests

## Validation

```text
git diff --check
npm run typecheck
npm test
npm run cron:run -- --date=2026-08-02 --dry-run
npm run cron:run -- --date=2026-08-02 --send
```

Results:

```text
typecheck passed
full test suite passed: 17 files, 101 tests
related Task 005 tests passed: 5 files, 45 tests
cron:run dry-run passed
cron:run send failed safely before network without SLACK_WEBHOOK_URL
```

## Scope Boundaries

- no GCP deployment
- no Cloud Scheduler setup
- no Secret Manager integration
- no real Hermes account schedule setup
- no real Slack webhook committed

## Next

Task 006: GCP deployment.

Security direction:

- separate Hermes agent container from AI Trend worker container
- keep Hermes low privilege with only worker invocation credentials
- keep Slack webhook, DB write, and Secret Manager access in the worker
- allow Hermes to learn from non-sensitive execution results and policy memory
- never store raw secrets or full webhook URLs in Hermes learning memory
- preserve the scheduled AI trend Slack digest behavior, initially daily at `07:00 KST`
