# 04. Cron Run Schema

## Goal

Add an additive SQLite table for scheduled cron run audit logging.

## Required Columns

- id
- idempotency key
- report date
- mode
- status
- started at
- finished at
- step name
- candidate count
- Slack attempt id
- error message

## Acceptance

Schema is additive and indexed for idempotency lookup.

The schema must also enforce duplicate scheduled send protection at the database level. A successful send claim for an idempotency key must be unique, while failed runs and dry-runs remain retryable.
