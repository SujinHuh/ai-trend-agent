# Step 09 - Send CLI

## Purpose

Add explicit manual Slack send command.

## Inputs

- report date
- limit
- `SLACK_WEBHOOK_URL`

## Expected Changes

```text
npm run slack:send -- --date=YYYY-MM-DD --limit=5
```

## Files Likely To Change

- `src/cli.ts`
- `package.json`
- tests

## Validation

Without `SLACK_WEBHOOK_URL`, command fails before network.

## Handoff Notes

Do not run real send unless user provides a webhook URL.
