# Step 12 - Tests

## Purpose

Protect ingestion invariants before live sources are trusted.

## Required Tests

- config validation
- enabled filtering and priority ordering
- RSS parser fixture
- Atom parser fixture
- GitHub Releases fixture
- HTML parser fixture
- cache hit
- force refresh
- partial source failure
- KST window filtering
- canonical duplicate prevention
- persistence integration
- CLI validation
- CLI ingestion

## Review Checklist

- tests use fixtures for deterministic parser coverage.
- live network is not required for normal test runs.
- temporary DB and cache paths do not pollute the repo.

## Done Criteria

- `npm run typecheck` passes.
- `npm test` passes.
- test count is recorded in validation report.
