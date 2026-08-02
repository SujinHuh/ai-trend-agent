# PR: Slack Manual Delivery

## Summary

- Add Slack Incoming Webhook payload rendering for Task 003 digest candidates.
- Add safe `slack:preview` and explicit `slack:send` commands.
- Add `slack_delivery_attempts` audit table and store functions.
- Add webhook URL validation, host-only logging, and error redaction.
- Add `.env.example` with `SLACK_WEBHOOK_URL`.

## Validation

```text
git diff --check       passed
npm run typecheck      passed
npm test               passed

15 test files passed
74 tests passed
```

CLI smoke:

```text
npm run slack:preview -- --date=2026-08-02 --limit=5
npm run slack:send -- --date=2026-08-02 --limit=5
```

`slack:send` failed before network because `SLACK_WEBHOOK_URL` is not configured.

## Showcase

```text
docs/showcase/004_slack_manual_delivery/completion.md
docs/showcase/004_slack_manual_delivery/completion.html
http://34.22.67.160/ai-trend-agent/showcase/004_slack_manual_delivery/completion.html
```

## Scope Notes

- No Hermes cron.
- No scheduled send.
- No Slack Bot API.
- No Slack interactivity.
- Duplicate-send prevention is Task 005.
