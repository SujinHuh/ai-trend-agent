# Step 7 - GitHub Releases Parser

## Purpose

Parse official GitHub release Atom feeds for developer-impacting AI tooling updates.

## Implementation Notes

Initial feed:

```text
https://github.com/openai/openai-python/releases.atom
```

Required behavior:

- parse release title.
- parse release URL.
- parse updated date.
- preserve summary as excerpt.
- tag source as `developer_tool`.

## Review Checklist

- OpenAI Python releases fixture parses.
- release URL becomes the canonical source URL.
- duplicate releases are deduped through canonical URL rules.

## Done Criteria

- GitHub release parser tests pass.
- release entries can be persisted as `TrendItem` and `SourceEvidence`.
