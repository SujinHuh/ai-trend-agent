# Step 11 - Ingestion CLI

## Purpose

Run source validation and local ingestion without Hermes, Slack, or GCP.

## Implementation Notes

Recommended commands:

```text
npm run sources:validate
npm run ingest:run -- --date=YYYY-MM-DD
npm run ingest:run -- --date=YYYY-MM-DD --force-refresh
npm run ingest:run -- --date=YYYY-MM-DD --db=PATH
```

CLI output should include:

- report date
- DB path
- cache path
- source results
- inserted count
- updated count
- failed source count

## Review Checklist

- invalid dates fail clearly.
- unknown options fail clearly.
- nonzero exit is used only for global failures.
- source-level failures are printed but do not fail the whole run when at least one source succeeds.

## Done Criteria

- CLI tests pass.
- manual CLI validation is recorded.
