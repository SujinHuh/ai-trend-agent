# 08. Deployment Smoke

## Purpose

Verify a deployed worker without exposing secrets.

## Inputs

- worker base URL
- cron secret

## Expected Changes

- smoke script for auth and minimized response checks

## Validation

Smoke should check:

- unauthenticated request fails when secret is configured.
- authenticated dry-run succeeds or returns a controlled non-2xx JSON.
- response does not include `cronRun`, `idempotencyKey`, or raw secrets.

## Handoff Notes

Smoke output must redact bearer tokens.
