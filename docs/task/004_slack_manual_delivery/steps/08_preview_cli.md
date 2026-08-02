# Step 08 - Preview CLI

## Purpose

Add safe Slack payload preview.

## Inputs

- report date
- limit

## Expected Changes

```text
npm run slack:preview -- --date=YYYY-MM-DD --limit=5
```

## Files Likely To Change

- `src/cli.ts`
- `package.json`
- tests

## Validation

Preview must not require `SLACK_WEBHOOK_URL`.

## Handoff Notes

Preview should be the default user-checkable path.
