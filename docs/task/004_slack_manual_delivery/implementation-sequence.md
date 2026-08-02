# Task 004 Implementation Sequence - Slack Manual Delivery

## Numbered Steps

1. Confirm branch and Task 003 dependency.
2. Add Task 004 docs and status tracking.
3. Add Slack delivery domain types.
4. Add delivery attempt DB schema.
5. Add store functions for delivery attempts.
6. Add Slack payload renderer.
7. Add Slack webhook sender with injectable transport.
8. Add `slack:preview` CLI.
9. Add `slack:send` CLI.
10. Add `.env.example`.
11. Add tests for renderer, sender, store, and CLI.
12. Run validation.
13. Create completion MD/HTML.
14. Prepare PR body and next handoff.

## Suggested Files

- `src/slack/render-slack-digest.ts`
- `src/slack/slack-webhook.ts`
- `tests/slack-renderer.test.ts`
- `tests/slack-webhook.test.ts`
- `tests/slack-cli.test.ts`

## Scope Boundary

Do not implement Hermes cron, Slack Bot API, or Slack interactivity in Task 004.

Do not commit real Slack webhook URLs.
