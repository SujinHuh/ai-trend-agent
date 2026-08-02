# 12. Validation

## Goal

Run full validation before completion.

## Commands

```text
git diff --check
npm run typecheck
npm test
npm run cron:run -- --date=YYYY-MM-DD --dry-run
```

## Acceptance

All commands pass or documented failures are fixed.
