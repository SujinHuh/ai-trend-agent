# 05. Store Functions

## Goal

Add store methods for cron run persistence.

## Required Functions

- create cron run
- mark cron run success
- mark cron run failure
- find successful cron run by idempotency key
- list cron runs by report date

## Acceptance

Failed runs remain retryable. Successful runs block duplicates.
