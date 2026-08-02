# Step 03 - Synthesis Domain Types

## Purpose

Define local TypeScript types for Task 003 synthesis records and digest candidates.

## Inputs

- `TrendItem`
- `SourceEvidence`
- Task 003 required outputs

## Expected Changes

- action level enum
- confirmation status enum
- trend category enum
- assessment and candidate interfaces

## Files Likely To Change

- `src/domain/types.ts`
- `src/synthesis/*`

## Validation

```text
npm run typecheck
```

## Handoff Notes

Types must match SQLite constraints and CLI JSON output.
