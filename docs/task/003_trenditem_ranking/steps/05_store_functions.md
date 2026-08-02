# Step 05 - Store Functions

## Purpose

Add repository functions for saving and reading trend assessments and digest candidates.

## Inputs

- `trend_items`
- `source_evidence`
- `trend_assessments`
- `trend_assessment_lineage`

## Expected Changes

- save assessment
- get assessment
- list source items by report date
- list digest candidates by date and limit

## Files Likely To Change

- `src/db/llm-wiki-store.ts`
- `tests/llm-wiki-store.test.ts`

## Validation

```text
npm test -- tests/llm-wiki-store.test.ts
```

## Handoff Notes

Persist original evidence links in lineage.
