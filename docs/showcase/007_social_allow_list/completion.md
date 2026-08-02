# Social Allow-List Completion

## Summary

Task 007 adds safe social/community signal ingestion for AI trend discovery.

The implementation does not treat social posts as confirmed facts. All social sources are disabled by default, manual imports must be public and provenance-backed, and X/Threads live collectors stay deferred until token scope and policy constraints are confirmed.

## Built

- social registry config
- social registry validation
- `SocialSignalSource`
- `SocialSignalItem`
- SQLite `social_signal_items`
- manual public JSONL importer
- Hacker News fixture normalizer
- Reddit RSS fixture normalizer
- official SourceEvidence URL matching
- capped ranking velocity boost
- `social:validate`, `social:import`, `social:list`

## Safety

- Social-only signals default to `needs_confirmation`.
- Manual imports reject private/deleted/screenshot/private chat content.
- API tokens are not stored in config.
- Authorization headers are not cached.
- X/Threads are deferred.
- Ranking boost is capped and does not increase confidence.
- Manual imports are atomic.
- Official domain matching includes allowed subdomains.

## Validation

```text
npm run typecheck passed
npm run build passed
focused tests passed: 5 files, 37 tests
full test suite passed: 20 files, 127 tests
git diff --check passed
```

## Next

Default next v2 task is Task 008 Backend, Frontend, DevOps domain expansion.

Deferred live social collectors are tracked separately as `007B_social_live_collectors`:

- X live collector
- Threads live collector
- HN/Reddit live polling runner

007B should run before Task 008 only if live social polling is explicitly prioritized.
