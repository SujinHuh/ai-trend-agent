# 06. Cloud Run Deploy

## Purpose

Deploy the worker to Cloud Run with least-privilege runtime settings.

## Inputs

- Docker image or source build
- Secret Manager secret names
- worker service account
- project and region

## Expected Changes

- deploy script
- service account and IAM setup commands
- environment variable contract

## Validation

Dry-run/script validation and Cloud Run service inspection after real deploy.

## Handoff Notes

Cloud Run deployment should set:

- `NODE_ENV=production`
- `CRON_REQUIRE_SECRET=true`
- `CRON_DEFAULT_MODE=send` only if explicitly wanted
