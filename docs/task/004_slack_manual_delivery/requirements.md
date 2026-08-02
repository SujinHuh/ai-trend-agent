# Task 004 Requirements - Slack Manual Delivery

## Purpose

Task 004 renders ranked Task 003 digest candidates into Slack Incoming Webhook payloads and supports manual sending.

This task does not add Hermes cron, scheduled automation, Slack Bot API, or interactive Slack feedback.

## Inputs

- ranked digest candidates from Task 003
- `TrendAssessment`
- `TrendAssessmentLineage`
- `TrendItem`
- `SLACK_WEBHOOK_URL` from environment for send only

## Required Outputs

1. Slack message payload renderer
2. preview command that does not send anything
3. send command that requires `SLACK_WEBHOOK_URL`
4. delivery attempt log
5. original source links
6. LLM Wiki stable IDs
7. Top AI Signals 3-5 items
8. urgent section placeholder using conservative rules

## CLI Requirements

Preview:

```text
npm run slack:preview -- --date=YYYY-MM-DD --limit=5
```

Send:

```text
npm run slack:send -- --date=YYYY-MM-DD --limit=5
```

Rules:

- `slack:preview` must never call Slack.
- `slack:send` must fail clearly when `SLACK_WEBHOOK_URL` is missing.
- `slack:send` must only send when explicitly requested.
- webhook URL must not be committed.
- `.env.example` may document `SLACK_WEBHOOK_URL`.
- logs, DB rows, docs, test fixtures, and error messages must not include the full webhook URL.
- delivery attempts store only the webhook host.
- production Slack webhook host must be `hooks.slack.com`.
- tests must use mock transports and non-real example URLs.

`slack:send` safety:

- missing `SLACK_WEBHOOK_URL` fails before network.
- `slack:preview` is the default safe path and must never send network.
- tests must not call real Slack.
- CI validation must not require a real webhook.
- successful sends are duplicate-guarded by `reportDate + payloadHash`.
- identical successful payloads must fail before network unless `--force-send` is explicit.

## Payload Requirements

The Slack payload must include:

- title: `AI Trend Daily Digest - YYYY-MM-DD`
- candidate count
- Top AI Signals section
- each item title
- summary
- why it matters
- practical impact
- action level
- confidence and importance score
- source URL
- LLM Wiki stable ID
- urgent section, only if conservative criteria match

Urgent criteria:

- `actionLevel = do_now`
- `confirmationStatus` is `confirmed` or `official_only`
- `confidence >= 0.85`
- `importanceScore >= 80`

## Delivery Attempt Log

Record each manual send attempt with:

- id
- report date
- target webhook host only, not full URL
- status: `success` or `failed`
- HTTP status code when available
- error message when available
- sent at timestamp
- payload hash

## Scope Boundary

Excluded:

- Hermes `/cron`
- scheduled delivery
- Slack Bot API
- Slack interactivity
- storing webhook secrets
- retry worker
- production alerting
- scheduled duplicate prevention beyond the manual `slack:send` guard

## Acceptance Criteria

- preview command outputs valid Slack webhook JSON.
- send command refuses to run without `SLACK_WEBHOOK_URL`.
- send command can be tested with a mock sender without network.
- delivery attempt log records success and failure.
- payload includes LLM Wiki stable IDs and source links.
- Task 004 does not decide ranking; it consumes Task 003 candidates.
- preview does not require a webhook URL and performs no network call.
- send logs only the webhook host, never the full webhook URL.
