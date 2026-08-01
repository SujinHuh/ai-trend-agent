# Task 001 Plan - LLM Wiki Local Store

## 1. Implementation Order

### 1. Branch Setup

Create the task branch:

```text
feature/001-llm-wiki-local-store
```

Expected status:

- Branch exists.
- Work is not committed directly to `main`.

### 2. Task Documents

Create task documents:

```text
docs/task/001_llm_wiki_local_store/
  requirements.md
  plan.md
  phase_status.md
  validation_report.md
```

Expected status:

- Requirements and plan are written before implementation.
- Progress status is tracked in `phase_status.md`.

### 3. Project Initialization

Initialize Node.js + TypeScript project structure.

Expected files:

- `package.json`
- `tsconfig.json`
- `src/`
- `tests/`

Expected scripts:

```text
npm test
npm run typecheck
npm run db:init
npm run sample:seed
npm run digest:get -- --date=YYYY-MM-DD
```

### 4. SQLite Dependency Selection

Use `better-sqlite3`.

Decision reason:

- Suitable for local CLI usage
- No separate database server
- Simple synchronous API for MVP

### 5. Schema Implementation

Create schema initialization for:

- `trend_items`
- `digests`
- `source_evidence`
- `digest_trend_items`

Required constraints:

- `trend_items.canonical_url` or `trend_items.canonical_hash` is unique.
- `digests.report_date` supports date lookup.
- `digest_trend_items` stores Digest-to-TrendItem membership.
- `source_evidence` stores source proof for TrendItems.

### 6. URL Identity Implementation

Implement canonical URL normalization.

Required behavior:

- Remove tracking parameters.
- Remove fragments.
- Normalize hostname.
- Normalize trailing slash.
- Sort remaining query parameters.
- Generate canonical hash with SHA-256.

### 7. Stable ID Implementation

Implement deterministic IDs.

Required behavior:

- Same canonical URL produces the same TrendItem ID.
- Same report date produces the same Digest ID.
- Evidence IDs are deterministic from their stable identity inputs.

### 8. Repository Implementation

Implement local store functions.

Required functions:

- Open database
- Initialize schema
- Save TrendItem
- Read TrendItem
- Prevent duplicate TrendItem by canonical identity
- Save Digest
- Link Digest to TrendItems
- Save SourceEvidence
- Read Digest by report date

### 9. CLI Implementation

Implement local CLI commands:

```text
npm run db:init
npm run sample:seed
npm run digest:get -- --date=YYYY-MM-DD
```

Expected behavior:

- `db:init` creates or updates schema.
- `sample:seed` inserts sample TrendItem, Digest, and SourceEvidence data.
- `digest:get` prints the Digest for the requested date.

### 10. Test Implementation

Add automated tests for:

- Canonical URL normalization
- Stable ID determinism
- Duplicate TrendItem prevention
- TrendItem save/read
- Digest save/read by date
- Digest-to-TrendItem relation
- SourceEvidence association

### 11. Validation Report

Update:

```text
docs/task/001_llm_wiki_local_store/validation_report.md
```

Include:

- Commands executed
- Test results
- DB path used
- Manual verification scenario
- Remaining risks

### 12. PR Preparation

Prepare PR summary with:

- What changed
- What was validated
- What is intentionally excluded
- Next task recommendation

## 2. Validation Commands

Expected final validation commands:

```text
npm run typecheck
npm test
npm run db:init
npm run sample:seed
npm run digest:get -- --date=YYYY-MM-DD
```

## 3. Done Criteria

Task 001 is done when:

- Requirements are satisfied.
- All required CLI commands work.
- Automated tests pass.
- Validation report is written.
- `phase_status.md` marks all steps as `Done` after review.
- The change is ready for PR review.
