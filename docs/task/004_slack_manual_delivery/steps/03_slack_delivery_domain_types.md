# Step 03 - Slack Delivery Domain Types

## Purpose

Define Slack payload and delivery attempt types.

## Inputs

- Task 003 digest candidates
- Slack Incoming Webhook payload shape

## Expected Changes

- payload interfaces
- attempt status enum
- sender result types

## Files Likely To Change

- `src/domain/types.ts`
- `src/slack/*`

## Validation

```text
npm run typecheck
```

## Handoff Notes

Types must avoid storing webhook secrets.
