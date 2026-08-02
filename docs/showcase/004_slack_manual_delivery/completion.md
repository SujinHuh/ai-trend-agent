# Slack Manual Delivery Completion

## Summary

Task 004 built manual Slack delivery for AI Trend Agent v2.

This task renders ranked Task 003 digest candidates into a Slack Incoming Webhook payload, supports safe preview, and provides an explicit manual send command. It does not add Hermes cron, scheduling, Slack Bot API, or Slack interactivity.

## What Was Built

- Slack webhook payload renderer
- conservative urgent section
- `slack_delivery_attempts` SQLite table
- delivery attempt store methods
- webhook sender with injectable mock transport for tests
- webhook URL host-only logging
- webhook URL redaction from errors
- Slack link URL delimiter escaping
- Slack payload block and text limit guards
- drifted `slack_delivery_attempts` schema detection
- `SLACK_WEBHOOK_URL` placeholder in `.env.example`
- local CLI commands:
  - `npm run slack:preview -- --date=YYYY-MM-DD --limit=5`
  - `npm run slack:send -- --date=YYYY-MM-DD --limit=5`

## Safety Rules

- `slack:preview` never sends a network request.
- `slack:send` requires `SLACK_WEBHOOK_URL`.
- missing `SLACK_WEBHOOK_URL` fails before network.
- only `https://hooks.slack.com/services/...` webhook URLs are accepted.
- delivery logs store only `hooks.slack.com`, never the full webhook URL.
- identical successful payloads are blocked by `reportDate + payloadHash` unless `--force-send` is explicit.

## What Was Intentionally Excluded

- Hermes `/cron`
- scheduled delivery
- Slack Bot API
- Slack interactivity
- retry worker
- scheduled duplicate prevention
- storing webhook secrets

## Validation

Latest validation:

```text
git diff --check       passed
npm run typecheck      passed
npm test               passed

15 test files passed
87 tests passed
related Task 004 tests passed: 5 files, 46 tests
```

CLI smoke:

```text
npm run slack:preview -- --date=2026-08-02 --limit=5
npm run slack:send -- --date=2026-08-02 --limit=5
```

`slack:preview` passed. `slack:send` failed before network because `SLACK_WEBHOOK_URL` is intentionally missing.

## Current Task Status

Task 004 progress:

```text
Steps 1-12 Done
Step 13 Done
Step 14 Review
```

Implementation review findings were addressed:

- urgent titles are Slack-escaped.
- webhook transport errors redact full Slack webhook URLs.
- webhook validation requires HTTPS and `/services/`.
- invalid webhook config returns a failed result for audit logging.
- manual duplicate-send prevention blocks identical successful payloads unless `--force-send` is explicit.
- Slack payload rendering enforces block and text limits.
- Slack link URLs escape mrkdwn delimiters before rendering.
- preview no-network validation runs in-process with `globalThis.fetch` spying.
- `slack:send` is testable with injected sender/env/stdout dependencies.
- drifted Slack delivery schemas fail initialization instead of being marked current.

## Files To Inspect

- `.env.example`
- `src/slack/render-slack-digest.ts`
- `src/slack/slack-webhook.ts`
- `src/db/schema.ts`
- `src/db/llm-wiki-store.ts`
- `src/domain/types.ts`
- `src/cli.ts`
- `tests/slack-renderer.test.ts`
- `tests/slack-webhook.test.ts`
- `tests/cli.test.ts`
- `docs/task/004_slack_manual_delivery/validation_report.md`

## What This Enables Next

The next implementation step is:

```text
5. Hermes /cron 연결
```

Task 005 can now call the same digest candidate and Slack send path on a schedule, then add cron-level idempotency around the manual delivery primitive from Task 004.
