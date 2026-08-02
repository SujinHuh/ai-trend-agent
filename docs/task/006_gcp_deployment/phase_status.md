# Task 006 Phase Status - GCP Deployment

## Status Values

- `Pending`: not started
- `In Progress`: being worked on
- `Review`: waiting for validation
- `Needs Fix`: validation failed
- `Done`: validated

## Checklist

| No. | Step | Status | Notes |
| --- | --- | --- | --- |
| 1 | Task docs | Done | Requirements, plan, status, validation report, and step docs created. |
| 2 | Security contract | Done | Defined Worker/Hermes/IAM/secret boundaries. |
| 3 | Production build | Done | Added build/start scripts for compiled JS runtime. |
| 4 | Docker image | Done | Added Dockerfile and `.dockerignore`. |
| 5 | Secret Manager setup | Done | Added script for required secrets. |
| 6 | Cloud Run deploy | Done | Added worker deployment script with least-privilege service account. |
| 7 | Scheduler/Hermes invocation | Done | Added 07:00 KST protected invocation script. |
| 8 | Deployment smoke | Done | Added smoke script for auth/minimized response checks. |
| 9 | Validation | Done | Typecheck, build, full suite, shell syntax, Docker build, image content check, container dry-run, and diff check passed. |
| 10 | Completion reports | Done | Created completion md/html. |
| 11 | PR and next handoff | Done | Created PR draft and identified real deployment inputs plus Task 007. |
| R1 | Real secrets | Done | Secret Manager secrets created and leaked Slack webhook versions destroyed. |
| R2 | Real Cloud Run worker | Done | Private Cloud Run worker deployed in `asia-northeast3`. |
| R3 | Real Cloud Scheduler | Done | `ai-trend-daily-digest` enabled at 07:00 KST with OIDC invoker. |
| R4 | Real deployment smoke | Done | Unauthenticated `/cron` blocked with 403; Scheduler invocation reached worker with 200. |
| R5 | Real completion handoff | Done | Slack receipt confirmed and final/sub-agent review findings fixed. |

## Progress Log

2026-08-02:

- Step 1 `In Progress`: Task 006 started from Task 005 security handoff.
- Step 1 `Done`: required Task 006 docs and numbered step docs created.
- Step 2 `Done`: Cloud Run security contract written with Worker/Hermes split and filesystem isolation.
- Step 3 `Done`: production build/start scripts added.
- Step 4 `Done`: production Dockerfile and `.dockerignore` added.
- Step 5 `Done`: Secret Manager setup script added.
- Step 6 `Done`: Cloud Run worker deploy script added.
- Step 7 `Done`: Cloud Scheduler protected invocation script added.
- Step 8 `Done`: deployment smoke script added.
- Step 9 `Done`: full validation passed.
- Step 10 `Done`: completion reports created.
- Step 11 `Done`: PR draft and next handoff created.
- Real deployment Step 1 `Done`: Secret Manager enabled, `ai-trend-cron-secret` and `ai-trend-slack-webhook-url` created, leaked Slack webhook versions destroyed, version 3 enabled.
- Real deployment Step 2 `Done`: Artifact Registry `ai-trend` created, image pushed, private Cloud Run service `ai-trend-worker` deployed.
- Real deployment Step 3 `Done`: Cloud Scheduler job `ai-trend-daily-digest` configured for `0 7 * * *` in `Asia/Seoul`.
- Real deployment Step 4 `Done`: public unauthenticated `/cron` request returned `403`; Scheduler manual run produced Cloud Run `POST 200`.
- Real deployment Step 5 `Done`: Slack receipt confirmed; completion docs and final review findings updated.
