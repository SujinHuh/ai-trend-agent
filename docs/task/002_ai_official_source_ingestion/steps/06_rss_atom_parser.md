# Step 6 - RSS and Atom Parser

## Purpose

Parse feed sources into a common raw article shape.

## Implementation Notes

Required fields to extract when present:

- title
- URL
- raw ID
- published date
- updated date
- author
- excerpt or summary

RSS and Atom parser behavior can share a common normalized output.

## Review Checklist

- Google Blog feed fixture parses.
- malformed entries do not crash the whole source.
- relative or missing links are handled explicitly.
- dates are kept as raw and parsed forms when possible.

## Done Criteria

- parser fixture tests pass.
- source result item counts are deterministic for fixtures.
