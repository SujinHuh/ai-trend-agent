# 07. Scheduler Or Hermes Invocation

## Purpose

Define the first production invoker for the worker.

## Inputs

- Cloud Run worker URL
- invoker service account
- cron secret
- schedule: `0 7 * * *`
- timezone: `Asia/Seoul`

## Expected Changes

- Cloud Scheduler command guidance or script
- Hermes invocation guidance

## Validation

Scheduler/Hermes request must:

- use `POST /cron`
- send `{"mode":"send"}`
- include bearer secret if using `CRON_SECRET`
- use IAM/OIDC when Cloud Run IAM is enabled

## Handoff Notes

Cloud Scheduler can be first invoker while Hermes container is attached later.
