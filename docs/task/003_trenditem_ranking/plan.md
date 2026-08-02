# Task 003 Plan - TrendItem Ranking and LLM Wiki Synthesis

## Goal

Turn stored `TrendItem` and `SourceEvidence` rows into deterministic daily digest candidates and LLM Wiki synthesis records.

Task 003 must stay local and deterministic. It does not add an LLM provider, Slack delivery, or social collectors.

## Execution Plan

1. Confirm branch and task scope.
2. Create numbered step documents and update status tracking.
3. Add synthesis domain types.
4. Add additive SQLite tables for assessments and source lineage.
5. Add store methods for saving, querying, and listing assessment candidates.
6. Add deterministic synthesis, ranking, trust gate, staleness, and contradiction defaults.
7. Add digest candidate selector and CLI.
8. Add minimal wiki query/index commands if scope remains small.
9. Add focused tests.
10. Run validation and create completion MD/HTML.

## Scope Boundaries

Included:

- deterministic ranking
- summary and why-it-matters fields
- action level, confidence, importance score, confirmation status
- source lineage linked to source evidence
- staleness and contradiction fields
- digest candidate CLI
- minimal local query/index output

Excluded:

- LLM-generated summaries
- Slack delivery
- Hermes cron
- X, Threads, Reddit, Hacker News collectors
- social signal API integration
- full wiki lint command

## Validation

Required commands:

```text
git diff --check
npm run typecheck
npm test
npm run digest:candidates -- --date=YYYY-MM-DD --limit=5
```

Task-specific tests:

- ranking order
- trust gate
- source lineage preservation
- staleness/contradiction fields
- CLI output
