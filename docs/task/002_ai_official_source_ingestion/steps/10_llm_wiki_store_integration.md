# Step 10 - LLM Wiki Store Integration

## Purpose

Persist normalized official-source items to the Task 001 SQLite store.

## Implementation Notes

Map each included item to:

- `TrendItem`
- `SourceEvidence`

Do not add LLM-generated summary fields in Task 002.

## Review Checklist

- canonical duplicate prevention still works.
- source evidence includes source name, source URL, publishedAt, fetchedAt, excerpt, and confidence.
- repository functions remain stable for Task 001 callers.

## Done Criteria

- persistence integration tests pass.
- repeated ingestion does not create duplicate trend rows.
- validation report records DB path and inserted/updated counts.
