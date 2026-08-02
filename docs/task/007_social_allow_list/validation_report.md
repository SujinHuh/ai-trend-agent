# Task 007 Validation Report - Social Allow-List Signal Ingestion

## Current Status

Task 007 implementation is complete locally and under final review.

## Implemented

- `SocialSignalSource` and `SocialSignalItem` domain types.
- `config/social-signals.json` with all sources disabled by default.
- Social registry loader and validation.
- Manual public JSONL importer.
- Hacker News fixture normalizer.
- Reddit RSS fixture normalizer.
- SQLite `social_signal_items` table and store methods.
- Official SourceEvidence canonical URL matching.
- Capped social velocity importance boost.
- CLI commands: `social:validate`, `social:import`, `social:list`.

## Security Review Findings Reflected

1. Manual imports require public HTTPS URL and provenance.
2. Deleted/private/screenshot/private chat content is rejected.
3. X/Threads collectors are deferred until token scopes, rate limits, and app review constraints are confirmed.
4. HTML collection cannot be enabled without explicit policy documentation.
5. Social-only claims remain `needs_confirmation`.
6. Confidence promotion requires existing canonical `SourceEvidence` or explicit official domain registry matching.
7. Ranking handoff uses social velocity only as a small capped importance boost, not confidence.
8. Subdomain official links such as `platform.openai.com` can match an allowed parent official domain.
9. Manual imports normalize and match all rows before saving, then persist in a transaction to avoid partial imports.
10. SourceEvidence lookup is batched once per manual import.

## Validation Commands

Passed:

```text
npm run typecheck
npm run build
npm test -- tests/social-source-config.test.ts tests/social-normalization.test.ts tests/schema.test.ts tests/trend-ranking.test.ts tests/cli.test.ts
npm test
git diff --check
```

Focused result:

```text
5 files passed
37 tests passed
```

Full result:

```text
20 files passed
127 tests passed
```

## Remaining Follow-ups

- `007B_social_live_collectors`: live HN/Reddit polling runner if live social polling is prioritized.
- `007B_social_live_collectors`: X/Threads live collectors after token scope, current rate limit, billing/app policy, and platform review constraints are confirmed.
- These are not part of Task 008 by default. Task 008 remains Backend, Frontend, DevOps domain expansion unless the user explicitly reprioritizes 007B first.
