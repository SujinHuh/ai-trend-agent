# Task 007B Plan - Social Live Collectors

## Steps

1. Create task branch and task documents.
2. Review Task 007 social allow-list storage and config boundaries.
3. Add HN live polling runner with cache and item limit.
4. Add Reddit RSS live polling runner with cache and item limit.
5. Keep X/Threads collectors as explicit deferred policy entries.
6. Add CLI or cron integration path for enabled live social polling.
7. Persist live social signals through the existing social signal store.
8. Match social signals to official evidence without increasing confidence for social-only claims.
9. Add focused tests.
10. Add validation report and completion showcase.
11. Create PR with Korean template.

## Status Rules

- `Pending`: step not started.
- `In Progress`: currently being implemented or reviewed.
- `Done`: implemented and validated.
- `Deferred`: intentionally delayed for security, policy, or token constraints.

## Implementation Priority

Start with HN/Reddit. Do not implement X/Threads before token scope and platform policy review.
