# 09. Cron CLI

## Goal

Add a local CLI command for cron simulation.

## Command

```text
npm run cron:run -- --date=YYYY-MM-DD --dry-run
```

Send mode:

```text
npm run cron:run -- --date=YYYY-MM-DD --send
```

## Acceptance

Dry-run works without `SLACK_WEBHOOK_URL`. Send mode requires it.
