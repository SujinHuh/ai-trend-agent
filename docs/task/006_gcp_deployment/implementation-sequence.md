# Task 006 Implementation Sequence - GCP Deployment

## Goal

Prepare and validate a secure Cloud Run deployment path for the Task 005 Hermes cron worker.

## Steps

1. Create task documents.
2. Define deployment security contract.
3. Add production build entrypoint.
4. Add Docker image and ignore policy.
5. Add Secret Manager setup.
6. Add Cloud Run worker deployment.
7. Add Scheduler/Hermes invocation guidance.
8. Add deployment smoke validation.
9. Run local validation.
10. Create completion reports.
11. Create PR draft and next handoff.

## Boundary

This task can create all deployable assets and validation scripts without knowing real secret values.

Actual production deployment is executed only after the user confirms:

1. GCP project id
2. region
3. Slack webhook secret value
4. cron secret generation/rotation policy
5. first invoker: Cloud Scheduler or Hermes
