# Step 04 - Delivery Attempt Schema

## Purpose

Add additive SQLite schema for manual Slack delivery attempts.

## Inputs

- existing schema
- delivery attempt requirements

## Expected Changes

- `slack_delivery_attempts` table
- indexes for report date and sent timestamp

## Files Likely To Change

- `src/db/schema.ts`
- `tests/schema.test.ts`

## Validation

```text
npm test -- tests/schema.test.ts
```

## Handoff Notes

Do not store full webhook URLs.
