# Task 002 Implementation Sequence - AI Official Source Ingestion

## 1. Purpose

This document defines the detailed execution sequence for `002_ai_official_source_ingestion`.

Task 002 takes the LLM Wiki local store from Task 001 and adds a source ingestion boundary. It fetches official AI updates, normalizes them, applies identity and dedupe rules, and saves them to SQLite.

## 2. Scope

Included:

- Source Registry config loading
- initial official source definitions
- fetch, retry, timeout, and cache
- RSS and Atom parsing
- GitHub Releases Atom parsing
- static HTML list parsing
- normalization and verification
- LLM Wiki persistence
- ingestion CLI
- tests and validation report

Excluded:

- LLM summaries
- ranking
- Slack delivery
- Hermes `/cron`
- GCP deployment
- web UI
- broad social/community ingestion

## 3. Implementation Sequence

하위 세부 계획:

- [steps/README.md](steps/README.md)

### 1. Create Feature Branch

Step plan:

- [steps/01_create_feature_branch.md](steps/01_create_feature_branch.md)

Branch:

```text
feature/002-ai-official-source-ingestion
```

Goal:

- keep Task 002 reviewable as an independent PR.
- base it on Task 001 after Task 001 is merged, or explicitly document if it is based on the Task 001 feature branch.

### 2. Create Task Documents

Step plan:

- [steps/02_create_task_documents.md](steps/02_create_task_documents.md)

Documents:

```text
docs/task/002_ai_official_source_ingestion/
  requirements.md
  plan.md
  implementation-sequence.md
  phase_status.md
  validation_report.md
```

Goal:

- fix scope before implementation.
- track progress using the same status rule as Task 001.

### 3. Implement Source Registry Config Loading

Step plan:

- [steps/03_source_registry_config_loading.md](steps/03_source_registry_config_loading.md)

Required behavior:

- load source config from a stable project path.
- apply default values.
- validate required fields.
- filter `enabled=true` sources.
- order by `priority`.
- dispatch by `parserType` or `type`.

Goal:

- source changes should happen through config, not source-specific code edits.

### 4. Add Initial Official Sources

Step plan:

- [steps/04_initial_official_sources.md](steps/04_initial_official_sources.md)

Required enabled sources:

- OpenAI News
- Anthropic News
- Google AI Blog or Google Blog Feed
- OpenAI Python GitHub Releases

Optional enabled source:

- Google DeepMind Blog

Goal:

- start with a small set of high-trust sources.
- avoid social/community firehose in Task 002.

### 5. Implement Fetch and Cache Layer

Step plan:

- [steps/05_fetch_cache_layer.md](steps/05_fetch_cache_layer.md)

Required behavior:

- timeout per source.
- retry with backoff.
- capture HTTP status.
- cache raw response by source and report date.
- support `--force-refresh`.
- avoid storing secrets in cache.

Cache path:

```text
.cache/sources/YYYY-MM-DD/{sourceId}.json
```

### 6. Implement RSS and Atom Parser

Step plan:

- [steps/06_rss_atom_parser.md](steps/06_rss_atom_parser.md)

Required behavior:

- parse feed title, URL, published date, updated date, author, and excerpt when present.
- normalize entries into an internal raw item shape.
- handle malformed items without crashing the whole source run.

### 7. Implement GitHub Releases Atom Parser

Step plan:

- [steps/07_github_releases_parser.md](steps/07_github_releases_parser.md)

Required behavior:

- parse GitHub release Atom entries.
- preserve release URL, title, updated date, and summary.
- tag release items as developer-tool official source items.

### 8. Implement Static HTML List Parser

Step plan:

- [steps/08_html_list_parser.md](steps/08_html_list_parser.md)

Required behavior:

- use selector config from Source Registry.
- support `self` selectors for anchor text and href.
- resolve relative URLs against source URL.
- treat selector failure as a source-level partial failure.
- do not require JavaScript rendering.

### 9. Implement Normalization and Verification

Step plan:

- [steps/09_normalization_verification.md](steps/09_normalization_verification.md)

Required behavior:

- require title and URL.
- canonicalize URL using Task 001 utility.
- generate stable IDs using Task 001 utility.
- compute `effectivePublishedAt`.
- apply KST report-window filtering.
- mark missing-date items for review instead of silently discarding them.
- record duplicate and exclusion reasons.

### 10. Persist to LLM Wiki Store

Step plan:

- [steps/10_llm_wiki_store_integration.md](steps/10_llm_wiki_store_integration.md)

Required behavior:

- map normalized source items into `TrendItem`.
- save `SourceEvidence` for each saved item.
- preserve source name, source URL, published date, fetched date, excerpt, and confidence.
- reuse canonical URL duplicate prevention.

### 11. Add Ingestion CLI

Step plan:

- [steps/11_ingestion_cli.md](steps/11_ingestion_cli.md)

Recommended commands:

```text
npm run sources:validate
npm run ingest:run -- --date=YYYY-MM-DD
npm run ingest:run -- --date=YYYY-MM-DD --force-refresh
npm run ingest:run -- --date=YYYY-MM-DD --db=PATH
```

Goal:

- validate source config and run ingestion locally before Hermes or GCP exists.

### 12. Write Tests

Step plan:

- [steps/12_tests.md](steps/12_tests.md)

Required tests:

- source config validation
- enabled filtering and priority ordering
- RSS and Atom parser fixtures
- GitHub Releases parser fixture
- HTML parser fixture
- cache hit and force refresh behavior
- partial source failure behavior
- KST window filtering
- canonical URL duplicate prevention
- repository integration into `TrendItem` and `SourceEvidence`

### 13. Write Validation Report

Step plan:

- [steps/13_validation_report.md](steps/13_validation_report.md)

Record:

- commands run
- test counts
- DB path
- cache path
- source result counts
- failed source details
- inserted and updated item counts
- remaining risks

Document:

```text
docs/task/002_ai_official_source_ingestion/validation_report.md
```

### 14. Create PR

Step plan:

- [steps/14_pr.md](steps/14_pr.md)

PR must include:

- implementation summary
- source list
- validation commands and results
- known parser or live-source risks
- explicit exclusions
- Task 003 handoff

## 4. Progress Status Rule

Use the same status flow as Task 001:

1. work starts as `Pending`.
2. active work moves to `In Progress`.
3. finished work moves to `Review`.
4. Codex reviews files, commands, and tests.
5. passing review becomes `Done`.
6. missing behavior becomes `Needs Fix`.
7. meaningful work, review, and fixes are logged in `docs/logs/YYYY-MM-DD.md`.

Status values:

- `Pending`
- `In Progress`
- `Review`
- `Needs Fix`
- `Done`

## 5. Suggested Sub-Agent Split

1. Source registry agent: config schema, defaults, and validation
2. Fetch/cache agent: HTTP, retry, timeout, and raw snapshot behavior
3. Parser agent: RSS, Atom, GitHub Releases Atom, and HTML fixtures
4. Normalization agent: canonical URL, stable ID, KST window, and verification
5. Persistence agent: `TrendItem` and `SourceEvidence` integration
6. Test/review agent: test coverage and validation report review

Do not run all agents at once before the source config and raw item shape are settled.
