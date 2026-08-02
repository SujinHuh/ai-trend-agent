# Task 007B Requirements - Social Live Collectors

## Goal

Implement live social signal collection after Task 007's disabled-by-default allow-list boundary.

The first priority is HN/Reddit live polling because they can be implemented with public feeds and lower credential risk. X and Threads remain deferred until token scope, rate limit, billing/app policy, and app review constraints are confirmed.

## Scope

- HN live polling runner.
- Reddit RSS live polling runner.
- Source-level `enabled` gate remains disabled by default.
- Polling interval, cache TTL, and max items per fetch must be configurable.
- Live social signals must preserve public URL, source, author/community when available, collected time, and provenance.
- Social-only claims must stay `needs_confirmation`.
- Official source matching may add a small importance boost, but must not turn social-only claims into confirmed facts.

## Deferred

- X live collector.
- Threads live collector.
- Any collector requiring unreviewed token scopes.
- Any collector that stores user credentials or broad social API tokens in repo, logs, or Hermes memory.

## Acceptance Criteria

1. HN/Reddit live polling can run without X/Threads credentials.
2. Disabled sources do not run accidentally.
3. All live collector network calls use timeout, cache, and item limit controls.
4. Imported live social signals are linked to official evidence only when URL/topic matching is explicit.
5. Tests cover disabled-by-default behavior, normalization, policy gates, and social-only `needs_confirmation`.
6. Completion markdown and HTML are created after implementation.
