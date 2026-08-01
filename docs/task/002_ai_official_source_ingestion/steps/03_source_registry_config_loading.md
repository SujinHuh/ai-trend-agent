# Step 3 - Source Registry Config Loading

## Purpose

Load source definitions from config instead of hardcoding source behavior.

## Implementation Notes

Recommended config path:

```text
config/sources.ai.official.json
```

Required behavior:

- parse source config JSON.
- apply defaults from `docs/source-registry.md`.
- validate required fields.
- validate parser compatibility with source type.
- filter disabled sources.
- sort enabled sources by descending priority.
- return source configs with normalized defaults.

## Review Checklist

- invalid config fails with actionable errors.
- disabled sources are ignored by ingestion.
- parser dispatch can be derived from `parserType` or `type`.
- no source-specific parser behavior is embedded in config loading.

## Done Criteria

- config loader tests pass.
- source validation CLI can use the loader.
- step 3 can move to `Done` after review.
