# Step 07 - Trust Gate and Policy Fields

## Purpose

Prevent unconfirmed signals from becoming high-action digest items.

## Inputs

- source lineage
- source credibility
- action level
- confirmation status

## Expected Changes

- trust gate
- contradiction notes
- staleness policy
- confidence cap for unconfirmed items

## Files Likely To Change

- `src/synthesis/trust-gate.ts`
- `src/synthesis/create-trend-synthesis.ts`
- tests

## Validation

`needs_confirmation` must not become `do_now`.

## Handoff Notes

Social-only items remain future Task 007 inputs.
