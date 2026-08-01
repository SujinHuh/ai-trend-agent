# Step 5 - Fetch and Cache Layer

## Purpose

Fetch source documents reliably and cache raw responses for repeatable local development.

## Implementation Notes

Cache path:

```text
.cache/sources/YYYY-MM-DD/{sourceId}.json
```

Required behavior:

- timeout per source.
- retry with configured backoff.
- cache HTTP status, headers needed for debugging, body, fetchedAt, and sourceId.
- use cache when fresh and `--force-refresh` is absent.
- do not cache API keys or auth headers.

## Review Checklist

- failed fetch creates a `SourceResult` failure.
- cache hit does not call network.
- `--force-refresh` bypasses cache.
- cache directory is ignored by git.

## Done Criteria

- cache tests pass.
- partial fetch failure tests pass.
- validation report records cache behavior.
