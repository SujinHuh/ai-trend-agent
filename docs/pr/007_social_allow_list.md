# PR: Task 007 Social Allow-List Signal Ingestion

## Summary

- add social source and social item domain types
- add disabled-by-default social registry config
- add social registry validation with token/platform policy gates
- add manual public JSONL importer
- add Hacker News and Reddit RSS fixture normalizers
- add SQLite storage for social signals
- add official SourceEvidence URL matching
- add capped social velocity boost to ranking
- add `social:validate`, `social:import`, and `social:list` CLI commands

## Security

- Social sources are disabled by default.
- Manual import requires public HTTPS URL and provenance.
- Deleted/private/screenshot/private chat content is rejected.
- X/Threads live collectors are deferred.
- Social-only claims remain `needs_confirmation`.
- Social velocity never increases fact confidence.
- Manual imports are atomic.
- Allowed official domains include subdomains.

## Validation

```text
npm run typecheck
npm run build
npm test -- tests/social-source-config.test.ts tests/social-normalization.test.ts tests/schema.test.ts tests/trend-ranking.test.ts tests/cli.test.ts
npm test
git diff --check
```

Result:

- focused suite passed: 5 files, 37 tests
- full suite passed: 20 files, 127 tests
- typecheck, build, and diff check passed

## Next

Move to Task 008 after user approval.
