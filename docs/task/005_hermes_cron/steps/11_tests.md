# 11. Tests

## Goal

Add focused tests for cron behavior.

## Coverage

- KST report date default
- dry-run without Slack webhook
- send mode with injected sender
- missing webhook failure in send mode
- idempotency duplicate block
- concurrent duplicate send race
- dry-run repeat does not block later send
- failed run retry
- HTTP method and auth
- HTTP response status codes for unauthorized, method mismatch, and duplicate send
- redacted error persistence and response output
- cron run store persistence

## Acceptance

Tests do not call real Slack or external networks.
