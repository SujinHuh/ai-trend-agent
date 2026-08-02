# Step 08 - Digest Candidate CLI

## Purpose

Expose daily ranked candidates through a local CLI.

## Inputs

- stored assessments
- report date
- limit

## Expected Changes

```text
npm run digest:candidates -- --date=YYYY-MM-DD --limit=5
```

## Files Likely To Change

- `package.json`
- `src/cli.ts`
- tests

## Validation

CLI should output JSON with report date, candidate count, and candidates.

## Handoff Notes

Slack formatting is Task 004, not Task 003.
