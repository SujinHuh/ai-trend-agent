# Task 007 Phase Status - Social Allow-List Signal Ingestion

## Checklist

| No. | Step | Status | Notes |
| --- | --- | --- | --- |
| 1 | Task docs | Done | Initial requirements, implementation sequence, and status docs created from sub-agent review. |
| 2 | Social registry schema | Done | `SocialSignalSource` added with policy/security metadata. |
| 3 | Registry validation | Done | Disabled by default; X/Threads and HTML collection cannot be enabled without policy gates. |
| 4 | Manual export importer | Done | Public URL/provenance required; private/deleted/screenshot/chat markers rejected. |
| 5 | HN collector | Done | Fixture-safe Firebase item normalizer; deleted/dead items discarded. |
| 6 | Reddit collector | Done | RSS fixture normalizer with keyword filtering. |
| 7 | X collector | Deferred | Token scopes, rate limits, and app policy confirmation required before implementation. |
| 8 | Threads collector | Deferred | Meta API scope/app review confirmation required before implementation. |
| 9 | Social item normalization | Done | `SocialSignalItem` added and stored in SQLite. |
| 10 | Official confirmation matching | Done | Canonical outbound URL to SourceEvidence matching. |
| 11 | Ranking handoff | Done | Social velocity is a capped importance boost only. |
| 12 | Tests and validation | Done | Typecheck, build, focused tests, full suite, diff check, and public HTML check passed. |

## Progress Log

2026-08-02:

- Step 2 `Done`: added social source and social item domain types.
- Step 3 `Done`: added social registry loader/validator and default disabled config.
- Step 4 `Done`: added manual JSONL importer with public provenance/privacy gates.
- Step 5 `Done`: added Hacker News fixture normalizer with deleted/dead filtering.
- Step 6 `Done`: added Reddit RSS fixture normalizer.
- Step 7 `Deferred`: X collector requires token scope/rate-limit/app policy confirmation.
- Step 8 `Deferred`: Threads collector requires API scope/app review confirmation.
- Step 9 `Done`: added social_signal_items SQLite table and store functions.
- Step 10 `Done`: added official SourceEvidence canonical URL matching.
- Step 11 `Done`: added capped social velocity boost to importance score only.
- Step 12 `Done`: sub-agent findings fixed; typecheck, build, full suite, diff check, and public HTML check passed.
