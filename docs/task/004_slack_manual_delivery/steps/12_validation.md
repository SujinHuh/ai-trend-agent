# Step 12 - Validation

## Purpose

Run and record Task 004 validation.

## Inputs

- completed implementation

## Expected Changes

- validation report updates
- work log updates

## Files Likely To Change

- `docs/task/004_slack_manual_delivery/validation_report.md`
- `docs/logs/YYYY-MM-DD.md`

## Validation

```text
git diff --check
npm run typecheck
npm test
npm run slack:preview -- --date=YYYY-MM-DD --limit=5
```

## Handoff Notes

Real Slack send remains manual and requires user-provided webhook URL.
