# 09. Validation

## Purpose

Run local validation for deployment assets.

## Inputs

- code changes
- Dockerfile
- scripts
- docs

## Expected Changes

- validation report updated with command output summary

## Validation

```text
npm run typecheck
npm run build
npm test
docker build -t ai-trend-agent:task006 .
git diff --check
```

## Handoff Notes

If Docker is unavailable, record the exact blocker.
