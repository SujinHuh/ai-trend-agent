# Step 06 - Deterministic Synthesis and Ranking

## Purpose

Create deterministic synthesis and ranking before any LLM provider exists.

## Inputs

- stored source items
- evidence excerpts
- source names
- published dates

## Expected Changes

- summary
- why it matters
- practical impact
- trend category
- importance score
- confidence

## Files Likely To Change

- `src/synthesis/create-trend-synthesis.ts`
- `src/synthesis/rank-trend-items.ts`
- `tests/trend-synthesis.test.ts`
- `tests/trend-ranking.test.ts`

## Validation

Ranking order must be deterministic for the same input.

## Handoff Notes

The first implementation should be rule-based and explainable.
