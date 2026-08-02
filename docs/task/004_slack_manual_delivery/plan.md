# Task 004 Plan - Slack Manual Delivery

## Goal

Render ranked Task 003 candidates into a Slack Incoming Webhook payload and support manual delivery.

## Execution Plan

1. Confirm Task 004 starts from Task 003 dependent branch.
2. Create task docs and numbered step docs.
3. Add Slack delivery domain types.
4. Add delivery attempt schema and store methods.
5. Add Slack payload renderer.
6. Add Slack webhook sender with injectable transport.
7. Add `slack:preview` CLI.
8. Add `slack:send` CLI.
9. Add `.env.example` with `SLACK_WEBHOOK_URL`.
10. Add tests.
11. Run validation.
12. Create completion MD/HTML and PR body draft.

## Default Decisions

- preview is the default safe workflow.
- send requires an explicit command and env var.
- no webhook URL is stored in DB or docs.
- log only webhook host, status, HTTP code, error, sent time, and payload hash.
- urgent section is conservative: `do_now`, official or confirmed, confidence `>= 0.85`, score `>= 80`.
- delivery log stores only `hooks.slack.com`, never the full webhook URL.
- tests use mock transport only.

## Validation

```text
git diff --check
npm run typecheck
npm test
npm run slack:preview -- --date=YYYY-MM-DD --limit=5
```

Manual send validation can use a mock sender in tests. Real Slack sending requires user-provided `SLACK_WEBHOOK_URL`.
