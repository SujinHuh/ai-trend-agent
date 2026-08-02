# 03. Cron Run Domain Types

## Goal

Add domain types for scheduled cron execution.

## Required Types

- cron mode: `dry_run` or `send`
- cron status: `running`, `success`, or `failed`
- cron run record
- cron worker result
- cron step result

## Acceptance

Types support persistence, CLI output, and HTTP JSON response without leaking secrets.
