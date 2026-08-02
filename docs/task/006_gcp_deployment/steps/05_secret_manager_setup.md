# 05. Secret Manager Setup

## Purpose

Provision required secrets without committing values.

## Inputs

- user-provided Slack webhook value
- generated cron secret
- GCP project id

## Expected Changes

- script to create/update:
  - `ai-trend-slack-webhook-url`
  - `ai-trend-cron-secret`

## Validation

Script fails if required environment variables are missing.

## Handoff Notes

The agent must not invent or print real secret values.
