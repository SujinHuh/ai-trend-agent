# TrendItem Ranking and LLM Wiki Synthesis Completion

## Summary

Task 003 built the deterministic ranking and LLM Wiki synthesis layer for AI Trend Agent v2.

This task turns stored `TrendItem` and `SourceEvidence` rows from Task 001/002 into ranked daily digest candidates. It does not call an LLM, send Slack messages, or collect new social sources.

## What Was Built

- additive SQLite tables:
  - `trend_assessments`
  - `trend_assessment_lineage`
- synthesis domain types for assessment, lineage, candidate, category, action, and confirmation status
- deterministic summary, why-it-matters, practical-impact, category, confidence, and score generation
- trust gate that prevents `needs_confirmation` signals from becoming `do_now`
- staleness and contradiction policy fields
- source lineage preservation from `SourceEvidence`
- idempotent assessment save by report date and trend item
- digest candidate selector with deterministic tie-breaks
- local CLI commands:
  - `npm run digest:candidates -- --date=YYYY-MM-DD --limit=5`
  - `npm run wiki:query -- --date=YYYY-MM-DD --limit=5`
  - `npm run wiki:index -- --date=YYYY-MM-DD --out=docs/wiki/index.md`

## What Was Intentionally Excluded

- LLM-generated summary text
- Slack message rendering or sending
- Hermes `/cron`
- X, Threads, Reddit, Hacker News, or social API collectors
- full wiki lint command
- production DB migration framework beyond additive local schema initialization

## Validation

Latest validation:

```text
git diff --check       passed
npm run typecheck      passed
npm test               passed

13 test files passed
60 tests passed
```

CLI smoke:

```text
npm run digest:candidates -- --date=2026-08-02 --limit=5
npm run wiki:query -- --date=2026-08-02 --limit=5
```

Both commands passed. The 2026-08-02 local data window currently has 0 candidates.

## Current Task Status

Task 003 progress:

```text
Steps 1-12 Done or Review
Step 13 Done
Step 14 Review
```

Implementation review findings were addressed:

- SQL ordering now includes `published_at` before limit.
- missing lineage evidence now fails instead of being silently ignored.
- schema initialization sets `PRAGMA user_version = 3`.
- `wiki:query` and `wiki:index` run synthesis before reading candidates.
- CLI date parsing rejects invalid dates.

## Files To Inspect

- `src/domain/types.ts`
- `src/db/schema.ts`
- `src/db/llm-wiki-store.ts`
- `src/synthesis/create-trend-synthesis.ts`
- `src/synthesis/rank-trend-items.ts`
- `src/synthesis/trust-gate.ts`
- `src/synthesis/select-digest-candidates.ts`
- `src/synthesis/run-synthesis.ts`
- `src/cli.ts`
- `tests/trend-synthesis.test.ts`
- `tests/trend-ranking.test.ts`
- `tests/llm-wiki-store.test.ts`
- `tests/cli.test.ts`
- `docs/task/003_trenditem_ranking/validation_report.md`

## What This Enables Next

The next implementation step is:

```text
4. Slack 수동 발송
```

Task 004 can now read ranked digest candidates with `summary`, `whyItMatters`, `practicalImpact`, `actionLevel`, `confidence`, `importanceScore`, and `sourceLineage`, then render them into a Slack Incoming Webhook payload without deciding ranking inside the Slack layer.
