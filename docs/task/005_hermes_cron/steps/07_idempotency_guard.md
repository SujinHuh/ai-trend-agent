# 07. Idempotency Guard

## Goal

Prevent duplicate successful scheduled sends.

## Rules

- Default idempotency key: `hermes-cron:daily-digest:YYYY-MM-DD`.
- A previous successful cron run with the same key blocks another send.
- Concurrent send attempts with the same key cannot both pass the guard.
- Failed runs do not block retry.
- Dry-runs do not block later sends.
- Explicit force mode may bypass the cron guard.
- Task 004 payload duplicate guard remains active.

## Acceptance

Duplicate scheduled sends fail before Slack network calls.

The guard must be backed by SQLite constraints or a transaction, not only by a preflight `SELECT`.
