# LLM Wiki Local Store Completion

## Summary

Task 001 built the local LLM Wiki foundation for AI Trend Agent v2.

This is not the final Rocket Brief style web news UI. It is the local storage layer that later ingestion, ranking, Slack delivery, Hermes cron, and the future web news screen will depend on.

## What Was Built

- SQLite-backed local LLM Wiki store
- `TrendItem` persistence
- `Digest` persistence
- `SourceEvidence` persistence
- Digest-to-TrendItem relation
- canonical URL normalization
- stable ID generation
- duplicate prevention by canonical URL/hash
- date-based digest lookup
- local CLI commands
- automated tests

## Current Task Status

Task 001 progress:

```text
1-11 Done
12 Done
```

The branch and PR are merged into `main`.

## Data Model

SQLite tables:

- `trend_items`
- `digests`
- `source_evidence`
- `digest_trend_items`

Key rules:

- `trend_items.canonical_url` is unique.
- `trend_items.canonical_hash` is unique.
- `digests.report_date` is unique.
- `digest_trend_items` stores digest membership and order.
- `source_evidence` stores source proof for each TrendItem.

## CLI Commands

Initialize a local database:

```bash
npm run db:init
```

Seed sample data:

```bash
npm run sample:seed
```

Read a digest by date:

```bash
npm run digest:get -- --date=2026-07-29
```

Use a temporary database:

```bash
npm run db:init -- --db=/tmp/ai-trend-agent-task001.sqlite
npm run sample:seed -- --db=/tmp/ai-trend-agent-task001.sqlite
npm run digest:get -- --db=/tmp/ai-trend-agent-task001.sqlite --date=2026-07-29
```

## Example Output

The sample digest returns:

- `digest_2026-07-29`
- 2 sample TrendItems
- 1 evidence row per item
- canonical URLs with tracking parameters removed
- stable IDs derived from canonical URL hashes

## Validation

Latest validation:

```text
npm run typecheck  passed
npm test           passed
6 test files passed
19 tests passed
```

Manual CLI validation passed:

```text
db:init -> passed
sample:seed -> passed
digest:get --date=2026-07-29 -> passed
```

## Files To Inspect

- `src/db/schema.ts`
- `src/db/llm-wiki-store.ts`
- `src/url/canonicalize-url.ts`
- `src/identity/stable-id.ts`
- `src/cli.ts`
- `tests/cli.test.ts`
- `docs/task/001_llm_wiki_local_store/phase_status.md`
- `docs/task/001_llm_wiki_local_store/validation_report.md`

## What This Enables Next

The next full implementation step is:

```text
2. AI 공식 출처 수집
```

That step can now save collected official AI source items into the LLM Wiki instead of writing temporary report files.
