# Step 07 - Slack Webhook Sender

## Purpose

Add explicit Slack webhook sender with injectable transport.

## Inputs

- webhook URL
- rendered payload

## Expected Changes

- sender function
- success/failure result
- webhook host extraction
- payload hash

## Files Likely To Change

- `src/slack/slack-webhook.ts`
- `tests/slack-webhook.test.ts`

## Validation

Tests must not call real Slack.

## Handoff Notes

Missing `SLACK_WEBHOOK_URL` should fail clearly.
