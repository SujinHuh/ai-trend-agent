# Task 007B Validation Report - Social Live Collectors

## Current Status

Task 007B implementation is complete locally and under final review.

## Implemented

- Source-level `livePolling` contract for polling interval, cache TTL, timeout, max items, retry count, and backoff.
- HN live polling runner using the public Hacker News Firebase API.
- Reddit live polling runner using public subreddit RSS.
- Shared cache/timeout behavior through the existing source fetch cache.
- `social:poll` CLI command with `--dry-run`, `--date`, `--cache-root`, `--force-refresh`, and optional `--source-id`.
- Official `SourceEvidence` URL matching handoff for live social signals.
- Disabled-by-default execution gate for all social sources.
- X/Threads live collectors kept deferred by policy.
- Malformed HN JSON is reported as a source-level error instead of aborting the whole poll run.
- Repeated HN polls reuse cached newstories and item responses within TTL.

## Security and Policy Review

1. Default `config/social-signals.json` keeps every social source disabled.
2. `social:poll` loads enabled sources only; disabled sources are skipped and do not fetch.
3. HN/Reddit live polling requires no credentials.
4. All live fetches use configured timeout, cache TTL, and max item controls.
5. X/Threads remain deferred until token scope, rate limit, billing/app policy, and app review are confirmed.
6. Social-only signals remain `needs_confirmation`.
7. Official evidence matching only links explicit outbound URLs to existing official evidence.
8. Dry-run mode normalizes and matches items without persisting them.
9. `pollingIntervalMinutes` is stored as scheduling metadata; this task ships a one-shot CLI poller and leaves interval enforcement to a later cron/scheduler integration.

## Sub-Agent Review

Completed after implementation:

- Code/security review: found one medium issue where malformed HN JSON could abort `social:poll`; fixed in `src/social/live-polling.ts` and covered by `tests/social-live-polling.test.ts`.
- Docs/GCP review: found that localhost wording was still too prominent for user-facing confirmation; fixed Task 007B validation, showcase, PR, and work log to use the GCP public URL.
- Additional post-review hardening added cache-hit coverage for repeated HN polling.
- Final post-fix sub-agent review found no blocking findings for PR.
- Follow-up user review found the completion HTML still did not match the prior report style closely enough; rewritten to the Task 003/004 status badge, metrics grid, section, and links pattern.
- Harness docs now require per-numbered-step implement, local validate, sub-agent review, fix, revalidate, and record before marking that step Done.
- Follow-up sub-agent review found the step-level review rule was still conditional in one place; fixed the harness to require sub-agent review for every implementation step and define the narrow status-only exception.
- Final re-check after wording fixes found no blocking findings.
- Remaining accepted note: `pollingIntervalMinutes` is config metadata in 007B, not an enforced scheduler gate.

## Validation Commands

Passed:

```text
npm run typecheck
npm run social:validate
npm run social:poll -- --date=2026-08-03 --dry-run
npm test -- tests/social-live-polling.test.ts tests/social-source-config.test.ts tests/cli.test.ts
npm test -- tests/social-source-config.test.ts tests/social-normalization.test.ts tests/social-live-polling.test.ts tests/cli.test.ts
git diff --check
npm run build
npm test
curl -I http://34.22.67.160/ai-trend-agent/showcase/007B_social_live_collectors/completion.html
```

Focused result:

```text
4 files passed
27 tests passed
```

Default social config result:

```text
sourceCount: 5
enabledSourceCount: 0
deferredSourceIds: threads-ai-watch, x-karpathy
```

Default dry-run polling result:

```text
sourceCount: 0
polledSourceCount: 0
savedCount: 0
```

Real public endpoint dry-run result:

```text
HN public Firebase API: fetchedCount 1, normalizedCount 1, savedCount 0, errors []
Reddit public RSS: fetchedCount 1, normalizedCount 1, savedCount 0, errors []
```

Post-review focused result:

```text
3 files passed
23 tests passed
```

Build result:

```text
npm run build passed
```

Diff check:

```text
git diff --check passed
```

Full result:

```text
21 files passed
133 tests passed
```

Public showcase result:

```text
GCP nginx completion HTML returned HTTP 200 and served Task 007B body
```

## Remaining Follow-ups

- Cron integration can call `social:poll` later only after an explicit scheduling policy is chosen.
- X/Threads live collectors remain deferred.
- Next task should be `007C_llm_digest_intelligence` or `008_domain_expansion`.

## PR

```text
https://github.com/SujinHuh/ai-trend-agent/pull/9
```
