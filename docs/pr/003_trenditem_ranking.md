# PR: TrendItem Ranking and LLM Wiki Synthesis

## Summary

- Add deterministic Task 003 synthesis and ranking for stored `TrendItem` rows.
- Add `trend_assessments` and `trend_assessment_lineage` SQLite tables.
- Add digest candidate, wiki query, and wiki index CLI commands.
- Add focused tests for schema, store, ranking, trust gate, lineage, and CLI output.

## Validation

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

## Showcase

```text
docs/showcase/003_trenditem_ranking/completion.md
docs/showcase/003_trenditem_ranking/completion.html
http://34.22.67.160/ai-trend-agent/showcase/003_trenditem_ranking/completion.html
```

## Scope Notes

- No LLM provider.
- No Slack delivery.
- No social source collector.
- No full wiki lint command.
