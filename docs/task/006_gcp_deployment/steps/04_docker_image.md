# 04. Docker Image

## Purpose

Create a production Docker image for AI Trend worker.

## Inputs

- package lockfile
- build script
- source files
- config files

## Expected Changes

- `Dockerfile`
- `.dockerignore`

## Validation

```text
docker build -t ai-trend-agent:task006 .
docker run --rm -p 3000:3000 -e NODE_ENV=production -e CRON_REQUIRE_SECRET=true -e CRON_SECRET=test ai-trend-agent:task006
```

## Handoff Notes

Image must not include `.env`, `data/`, `.cache/`, `.git/`, or local docs artifacts.
