# Step 05 - Store Functions

## Purpose

Add repository functions for saving and listing Slack delivery attempts.

## Inputs

- `slack_delivery_attempts`

## Expected Changes

- save attempt
- list attempts by report date

## Files Likely To Change

- `src/db/llm-wiki-store.ts`
- `tests/llm-wiki-store.test.ts`

## Validation

```text
npm test -- tests/llm-wiki-store.test.ts
```

## Handoff Notes

Attempt IDs should be stable enough for audit but not expose secrets.
