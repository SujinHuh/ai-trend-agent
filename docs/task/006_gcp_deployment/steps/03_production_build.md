# 03. Production Build

## Purpose

Run Cloud Run from compiled JavaScript instead of `tsx`.

## Inputs

- `src/cli.ts`
- `tsconfig.json`
- `package.json`

## Expected Changes

- add production build script
- add production cron server start script
- avoid compiling tests into production runtime

## Validation

```text
npm run build
node dist/src/cli.js cron:serve
```

## Handoff Notes

Docker image should call the production start script.
