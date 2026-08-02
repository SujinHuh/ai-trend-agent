# 08. HTTP Cron Endpoint

## Goal

Add a Hermes-compatible HTTP endpoint.

## Requirements

- `POST /cron`
- JSON response
- bearer auth using `CRON_SECRET`
- fail closed when `CRON_REQUIRE_SECRET=true` or `NODE_ENV=production` and `CRON_SECRET` is missing
- dry-run and send modes
- no full secrets in logs or responses
- response body must be minimized and must not include full `cronRun` rows or idempotency keys
- request body must be JSON and size-limited
- HTTP `force` must be ignored unless `CRON_ALLOW_FORCE=true`
- default mode is `dry_run`; send mode must be explicit
- unsupported methods return 405
- auth failures return 401 when `CRON_SECRET` is set
- duplicate successful sends return a non-2xx JSON error before Slack network calls

## Acceptance

Endpoint tests cover method validation, auth, required production secret, dry-run, duplicate guard, response minimization, request body limit, and force gating.
