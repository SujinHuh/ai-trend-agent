# Step 8 - HTML List Parser

## Purpose

Parse official news pages that do not expose stable RSS or Atom feeds.

## Implementation Notes

Required behavior:

- use `htmlParserConfig` selectors.
- support `self` for anchor text and href.
- resolve relative URLs.
- extract title, URL, date, author, and excerpt when available.
- treat selector failure as a source-level failure.
- avoid JavaScript rendering.

## Review Checklist

- OpenAI News fixture parses.
- Anthropic News fixture parses.
- duplicate navigation links are filtered.
- parser does not hardcode OpenAI or Anthropic-specific logic.

## Done Criteria

- HTML fixture tests pass.
- failure behavior is tested.
- selector drift risk is documented.
