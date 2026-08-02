# Step 12 - Run Validation

## Purpose

Run the required Task 003 validation commands and record exact results.

## Inputs

- completed implementation
- tests
- CLI commands

## Expected Changes

- validation result entries
- risk notes

## Files Likely To Change

- `docs/task/003_trenditem_ranking/validation_report.md`
- `docs/logs/YYYY-MM-DD.md`

## Validation

```text
git diff --check
npm run typecheck
npm test
npm run digest:candidates -- --date=YYYY-MM-DD --limit=5
```

## Handoff Notes

Failures move the relevant step to `Needs Fix`.
