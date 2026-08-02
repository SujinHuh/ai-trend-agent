# Task 003 Implementation Sequence - TrendItem Ranking and LLM Wiki Synthesis

## Numbered Steps

1. Create Task 003 branch after Task 001 and Task 002 merge order is decided.
2. Add task docs and status tracking.
3. Add synthesis/assessment domain types.
4. Add DB tables for trend assessment and source lineage.
5. Add repository functions for saving and querying assessments.
6. Add deterministic summarizer and ranker.
7. Add trust gate for `needs_confirmation`.
8. Add staleness and contradiction note fields.
9. Add digest candidate selector.
10. Add CLI command:

```text
npm run digest:candidates -- --date=YYYY-MM-DD --limit=5
```

11. Add minimal query/index commands only if they stay local and deterministic:

```text
npm run wiki:query -- --date=YYYY-MM-DD
npm run wiki:index -- --out=docs/wiki/index.md
```

Do not add full wiki lint or LLM query behavior in Task 003.

12. Add tests for ranking, gate, source lineage, candidate selection, and CLI output.
13. Run validation.
14. Update PR body and docs.

## Suggested Files

- `src/synthesis/rank-trend-items.ts`
- `src/synthesis/create-trend-synthesis.ts`
- `src/synthesis/select-digest-candidates.ts`
- `src/synthesis/source-lineage.ts`
- `tests/trend-ranking.test.ts`
- `tests/trend-synthesis.test.ts`
- `tests/digest-candidates-cli.test.ts`

## Scope Boundary

Do not implement X, Threads, Reddit, or Hacker News collectors in Task 003. Task 003 may only consume social lineage if it already exists.

Do not implement Slack payload rendering or sending in Task 003. Slack-ready means the candidate has enough local fields for Task 004 to render later.
