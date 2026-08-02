# PR: Task 006 GCP Deployment

## Summary

- add production build/start scripts for compiled cron worker runtime
- add secure Cloud Run worker Dockerfile and `.dockerignore`
- add Secret Manager setup, Cloud Run deploy, Cloud Scheduler invocation, and deployment smoke scripts
- document Worker/Hermes service account and secret boundaries
- add deployment asset tests
- deploy the private Cloud Run worker and daily Cloud Scheduler job in the confirmed GCP project

## Security

- Cloud Run deploy script disables unauthenticated access.
- Worker runs with `NODE_ENV=production` and `CRON_REQUIRE_SECRET=true`.
- `CRON_ALLOW_FORCE` is not enabled.
- Worker and invoker service accounts are separated.
- Worker can read only required Secret Manager secrets.
- Cloud Run invoker policy contains only the Scheduler invoker service account.
- Worker secrets are Secret Manager references, not repo or image literals.
- Docker image excludes `.env`, `.git`, tests, data, cache, and showcase artifacts.

## Validation

```text
npm run typecheck
npm run build
npm test
git diff --check
bash -n scripts/cloud-run/*.sh
node dist/src/cli.js cron:run --date=2026-08-02 --dry-run
DOCKER_API_VERSION=1.41 docker build -t ai-trend-agent:task006 .
DOCKER_API_VERSION=1.41 docker run --rm ai-trend-agent:task006 node dist/src/cli.js cron:run --date=2026-08-02 --dry-run
```

Result:

- full suite passed: 18 files, 117 tests
- Docker image build passed
- Docker runtime dry-run passed
- image content check confirmed sensitive/local-only files were excluded
- real unauthenticated `/cron` call returned `403`
- real Scheduler manual invocation logged Cloud Run `POST 200`

## Deployment

- Project: `project-7296a491-98d3-4b50-abe`
- Region: `asia-northeast3`
- Cloud Run service: `ai-trend-worker`
- Service URL: `https://ai-trend-worker-edjrjtiwga-du.a.run.app`
- Scheduler job: `ai-trend-daily-digest`
- Schedule: `0 7 * * *`, `Asia/Seoul`

## Not Included

- Cloud SQL/Firestore migration
- Cloud Storage raw snapshot migration
- full Hermes learning service deployment
- Task 007 social allow-list expansion

## Showcase

- `docs/showcase/006_gcp_deployment/completion.md`
- `docs/showcase/006_gcp_deployment/completion.html`

Public URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/006_gcp_deployment/completion.html
```

## Next

The next v2 implementation task is Task 007 social allow-list expansion.
