# Task 001 Requirements - LLM Wiki Local Store

## 1. Goal

Build a local SQLite-backed LLM Wiki store that becomes the shared data foundation for ingestion, ranking, Slack digest delivery, Hermes cron, and future web news views.

## 2. Scope

Included:

- Node.js + TypeScript project foundation
- SQLite local database
- Schema initialization
- TrendItem persistence
- Digest persistence
- SourceEvidence persistence
- Digest-to-TrendItem relation
- Canonical URL normalization
- Stable ID generation
- Duplicate prevention by canonical URL/hash
- Date-based digest lookup
- Local CLI commands
- Automated tests for core invariants

Excluded:

- External source ingestion
- LLM summarization
- Ranking logic
- Slack delivery
- Hermes `/cron`
- GCP deployment
- Web UI

## 3. Data Entities

Required entities:

- `TrendItem`
- `Digest`
- `SourceEvidence`
- `DigestTrendItem`

## 4. Canonical URL Rules

The implementation must:

- Prefer `https`
- Lowercase hostname
- Remove URL fragment
- Remove trailing slash
- Remove tracking query parameters: `utm_*`, `fbclid`, `gclid`, `ref`, `source`
- Sort remaining query parameters by key

## 5. Stable ID Rules

The implementation must generate deterministic IDs from canonical identity.

Required rule:

```text
canonicalHash = sha256(canonicalUrl)
```

Recommended ID format:

```text
trend_<hash_prefix>
digest_<report_date>
evidence_<hash_prefix>
```

## 6. Required CLI Commands

Required commands:

```text
npm run db:init
npm run sample:seed
npm run digest:get -- --date=YYYY-MM-DD
```

## 7. Acceptance Criteria

- A fresh checkout can initialize the local SQLite database.
- Required tables are created without manual SQL execution.
- A TrendItem can be saved and read back.
- The same source URL with tracking query differences maps to the same canonical URL.
- Duplicate TrendItems are prevented by canonical URL or canonical hash.
- Stable IDs are deterministic for the same canonical URL.
- A Digest can be saved for a report date.
- A Digest can be linked to one or more TrendItems.
- A Digest can be retrieved by report date.
- SourceEvidence can be saved and associated with a TrendItem.
- Required CLI commands run locally.
- Automated tests cover canonical URL normalization, stable ID generation, duplicate prevention, TrendItem lookup, and Digest date lookup.

## 8. Non-Goals

- Do not fetch live external sources.
- Do not call any LLM API.
- Do not send Slack messages.
- Do not build a web screen.
- Do not deploy to cloud infrastructure.
