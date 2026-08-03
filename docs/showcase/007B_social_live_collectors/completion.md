# Social Live Collectors Completion

## Summary

Task 007B adds opt-in live polling for fast community signals.

HN and Reddit can now be polled through public endpoints with cache, timeout, and item limit controls. The default registry still keeps every social source disabled, so live polling only runs after a source is explicitly enabled in config.

The browser report HTML now follows the prior v2 completion format used by Task 003/004: status badge, metrics grid, card sections, validation block, review findings, exclusions, next task, and confirmation links.

## Built

- `livePolling` source config contract
- HN Firebase API live polling
- Reddit subreddit RSS live polling
- shared cache and timeout controls
- `social:poll` CLI
- `social:poll --dry-run`
- official SourceEvidence matching handoff
- disabled-source fetch guard
- X/Threads deferred policy
- malformed HN JSON source-level error handling
- repeated HN polling cache-hit coverage

## Safety

- Social-only signals stay `needs_confirmation`.
- HN/Reddit polling requires no credentials.
- Disabled sources do not fetch.
- Live calls use timeout, cache TTL, and max item limits.
- Dry-run does not persist social items.
- X/Threads stay deferred until policy and token review.

## Validation

```text
npm run typecheck passed
npm run social:validate passed: 5 sources, 0 enabled
npm run social:poll -- --date=2026-08-03 --dry-run passed: 0 polled, 0 saved
real public HN/Reddit dry-run passed: 2 polled, 0 saved
focused tests passed: 4 files, 27 tests
post-review focused tests passed: 3 files, 23 tests
git diff --check passed
npm run build passed
full test suite passed: 21 files, 133 tests
GCP public completion HTML passed: HTTP 200
```

Sub-agent review:

```text
code/security review completed
docs/GCP review completed
medium HN malformed JSON issue fixed
GCP public URL wording fixed
```

Public URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007B_social_live_collectors/completion.html
```

## Next

After 007B, choose between:

- `007C_llm_digest_intelligence`: LLM summary, judgment, and token/cost logging.
- `008_domain_expansion`: Backend, Frontend, DevOps source/domain expansion.
