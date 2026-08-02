# Step 09 - Query and Index Entrypoints

## Purpose

Add small local query/index entrypoints if they remain simple.

## Inputs

- stored assessments
- report date
- output path

## Expected Changes

```text
npm run wiki:query -- --date=YYYY-MM-DD
npm run wiki:index -- --out=docs/wiki/index.md
```

## Files Likely To Change

- `package.json`
- `src/cli.ts`
- `docs/wiki/index.md`
- tests

## Validation

Index output should be deterministic and local.

## Handoff Notes

Full wiki lint remains later work.
