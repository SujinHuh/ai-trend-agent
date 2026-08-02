# Step 04 - Assessment Schema

## Purpose

Add additive SQLite tables for trend assessments and source lineage.

## Inputs

- Task 001 schema
- Task 003 domain types

## Expected Changes

- `trend_assessments`
- `trend_assessment_lineage`
- indexes for report date, score, status, and trend item lookup

## Files Likely To Change

- `src/db/schema.ts`
- `tests/schema.test.ts`

## Validation

```text
npm test -- tests/schema.test.ts
```

## Handoff Notes

Avoid destructive migrations or table rewrites.
