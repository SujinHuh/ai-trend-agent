# AI Official Source Ingestion Completion

## Summary

Task 002 built the official AI source ingestion pipeline for AI Trend Agent v2.

This is not the final LLM summary/ranking or Slack digest step. It is the source ingestion boundary that fetches official AI updates, parses them, normalizes them, caches raw source snapshots, and saves verified items into the LLM Wiki local store from Task 001.

## What Was Built

- Source Registry config loading and validation
- official AI source definitions
- HTTP fetch with timeout, retry, and local raw snapshot cache
- RSS/Atom parser
- GitHub Releases Atom parser
- static HTML list parser
- KST report-window filtering
- source-level partial failure reporting
- canonical URL and stable ID reuse from Task 001
- LLM Wiki persistence as `TrendItem` and `SourceEvidence`
- local CLI commands:
  - `npm run sources:validate`
  - `npm run ingest:run`
- Task 003/Task 007 handoff docs for LLM Wiki synthesis and social signal collection

## Enabled MVP Sources

The live-validated enabled sources are:

1. `anthropic-news`
2. `mistral-news`
3. `huggingface-blog-feed`
4. `github-openai-python-releases`

## Disabled Backlog Sources

These are recorded but disabled in Task 002:

- `openai-news`: server-side fetch returned HTTP 403.
- `google-blog-feed`: configured feed URL returned HTML instead of RSS.
- `google-deepmind-blog`
- `meta-ai-blog`
- `moonshot-kimi-blog`
- `kimi-k3-page`
- `deepseek-api-updates`
- `qwen-blog`
- `spring-news`

## Social Signal Policy

Famous AI people, X/Twitter, Threads, Reddit, Hacker News, and newsletters are not enabled ingestion sources in Task 002.

They are handled as future social signal work:

- X/Twitter: official X API, not browser scraping
- Threads: Meta Threads API or manual export/import
- Reddit: RSS/API
- Hacker News: official Firebase API
- all social signals default to `needs_confirmation`

## CLI Commands

Validate source config:

```bash
npm run sources:validate
```

Run ingestion:

```bash
npm run ingest:run -- --date=2026-08-01 --force-refresh
```

Use a temporary database:

```bash
npm run ingest:run -- \
  --db=/tmp/ai-trend-agent-task002-live.sqlite \
  --cache-root=/tmp/ai-trend-agent-task002-live-cache \
  --date=2026-08-01 \
  --force-refresh
```

## Validation

Latest validation:

```text
npm run typecheck       passed
npm test                passed
npm run sources:validate passed

11 test files passed
49 tests passed
13 configured sources
4 enabled MVP sources
```

Manual live ingestion validation:

```text
2026-08-01 failedSourceCount 0 insertedOrUpdatedCount 1
2026-07-31 failedSourceCount 0 insertedOrUpdatedCount 2
2026-07-30 failedSourceCount 0 insertedOrUpdatedCount 1
```

## Current Task Status

Task 002 progress:

```text
Steps 1-13 Done
Step 14 Review
```

The branch and PR are pushed:

```text
https://github.com/SujinHuh/ai-trend-agent/pull/1
```

## Files To Inspect

- `config/sources.ai.official.json`
- `src/sources/source-config.ts`
- `src/sources/fetch-cache.ts`
- `src/sources/ingest-sources.ts`
- `src/sources/parsers/rss-atom-parser.ts`
- `src/sources/parsers/github-releases-parser.ts`
- `src/sources/parsers/html-list-parser.ts`
- `src/sources/normalize-source-item.ts`
- `docs/task/002_ai_official_source_ingestion/validation_report.md`
- `docs/remaining-implementation-plan.md`
- `docs/social-signal-collection-plan.md`

## What This Enables Next

The next implementation step is:

```text
3. TrendItem 생성과 랭킹
```

Task 003 can now read ingested `TrendItem` and `SourceEvidence` rows and create ranked LLM Wiki synthesis records with `summary`, `whyItMatters`, `practicalImpact`, `actionLevel`, `confidence`, and `sourceLineage`.
