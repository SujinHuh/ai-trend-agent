# 02. Security Contract

## Purpose

Define the GCP security boundary before deployment scripts are written.

## Inputs

- Task 005 security handoff
- `docs/requirements-v2-llm-wiki-hermes.md`

## Expected Changes

- Worker/Hermes permission split documentation
- environment variable contract
- service account policy notes

## Validation

Review confirms:

- Hermes does not receive Slack webhook or DB write credentials.
- Worker receives secrets through Secret Manager.
- `/cron` is protected by IAM/OIDC or `CRON_SECRET`.
- container has no broad host folder access.

## Handoff Notes

Implementation must follow this contract, not merely document it.
