# Task 003 Phase Status - TrendItem Ranking and LLM Wiki Synthesis

## Status Values

- `Pending`: not started
- `In Progress`: being worked on
- `Review`: waiting for validation
- `Needs Fix`: validation failed
- `Done`: validated

## Checklist

| No. | Step | Status | Notes |
| --- | --- | --- | --- |
| 1 | Branch setup | Pending | Start after Task 001/002 merge order is clear. |
| 2 | Task docs | Done | Initial requirements, implementation sequence, and status docs created from sub-agent review. |
| 3 | Synthesis domain types | Pending | `summary`, `whyItMatters`, `practicalImpact`, category, action, confidence, score. |
| 4 | DB schema | Pending | Prefer additive tables over mutating Task 001/002 tables heavily. |
| 5 | Store functions | Pending | Save/query trend assessments and lineage. |
| 6 | Deterministic ranker | Pending | Rule-based first; LLM provider later. |
| 7 | Trust gate | Pending | Prevent unconfirmed social signal promotion. |
| 8 | Staleness/contradiction policy | Pending | Store fields first; full lint later. |
| 9 | Digest candidate CLI | Pending | `digest:candidates`. |
| 10 | Query/index entrypoint | Pending | Minimal DB query/index, no LLM query yet. |
| 11 | Tests | Pending | Ranking, gate, lineage, CLI. |
| 12 | Validation report | Pending | Record commands and risks. |
