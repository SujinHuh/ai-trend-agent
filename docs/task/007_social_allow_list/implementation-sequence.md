# Task 007 Implementation Sequence - Social Allow-List Signal Ingestion

## Numbered Steps

1. Create Task 007 branch after Task 003 trust gate exists.
2. Add social source registry config.
3. Add registry loader and validation.
4. Add manual export importer first.
5. Add Hacker News API collector.
6. Add Reddit RSS/API collector.
7. Add X API collector only when token/rate limit plan is available.
8. Add Threads collector only when Meta API scope is confirmed.
9. Normalize all items into `SocialSignalItem`.
10. Extract outbound URLs.
11. Match outbound URLs to official `SourceEvidence` canonical URLs.
12. Assign confirmation status.
13. Pass social velocity to Task 003 ranking as a boost only.
14. Add pruning and lint policy for noisy accounts.
15. Add tests and validation report.

## What Counts As Crawling

- API collection is not browser crawling.
- RSS polling is feed collection, not browser crawling.
- manual export import is not crawling.
- HTML collection is allowed only when the site permits it and no login/control bypass is needed.
- X/Threads browser scraping is out of scope.

## Recommended Start Order

1. Manual JSONL import
2. Hacker News official API keyword scan
3. Reddit RSS allow-list
4. X API allow-list
5. Threads API/manual import

This order gives fast progress without platform-risk-heavy scraping.
