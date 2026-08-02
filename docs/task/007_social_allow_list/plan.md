# Task 007 Plan - Social Allow-List Signal Ingestion

## Scope

Implement safe social/community signal ingestion without treating social posts as confirmed facts.

## Implementation

1. Add social registry and item types.
2. Add disabled-by-default social source config.
3. Validate token/policy gates for X, Threads, and HTML collection.
4. Implement manual public JSONL import first.
5. Implement fixture-safe Hacker News and Reddit RSS normalizers.
6. Store normalized social items in SQLite.
7. Match outbound URLs to existing canonical official SourceEvidence.
8. Pass social velocity to ranking only as a capped importance boost.
9. Add tests, validation report, and completion report.

## Non-Goals

- X/Threads live collectors before token scope and rate-limit confirmation.
- Browser scraping or login/cookie bypass.
- Promoting social-only claims to confirmed facts.
- Slack Bot API or feedback personalization.
