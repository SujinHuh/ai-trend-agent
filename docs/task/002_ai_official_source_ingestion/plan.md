# Task 002 Plan - AI Official Source Ingestion

## 1. Implementation Plan

1. Confirm Task 001 is merged or explicitly choose Task 001 feature branch as the base.
2. Create Task 002 branch.
3. Add source config schema and initial official source configs.
4. Add fetch/cache layer.
5. Add parser paths for RSS, Atom, GitHub Releases Atom, and static HTML.
6. Add normalization and verification.
7. Persist normalized items to the existing LLM Wiki store.
8. Add ingestion CLI.
9. Add tests.
10. Run validation and update docs.

## 1.1 Feedback Plan for a Solo Developer

When reporting progress or reviewing sources, Codex should use this structure:

1. Do now: the smallest action that moves the project forward.
2. Do next: the next implementation or review step.
3. Watch later: fast-moving sources worth tracking but not enabling yet.
4. Risk: what could be noisy, stale, unofficial, or expensive.

This keeps the work navigable for one developer while still preserving broad trend coverage.

## 2. Technical Shape

Recommended source tree:

```text
src/sources/
  source-config.ts
  source-registry.ts
  fetch-source.ts
  source-cache.ts
  parsers/
    rss-parser.ts
    atom-parser.ts
    github-releases-parser.ts
    html-list-parser.ts
  normalize-article.ts
  ingest-sources.ts
```

Recommended config path:

```text
config/sources.ai.official.json
```

Recommended test fixtures:

```text
tests/fixtures/sources/
  openai-news.html
  anthropic-news.html
  google-blog-feed.xml
  github-releases.atom
```

## 2.1 Step Sub-Plans

Each implementation phase has a dedicated sub-plan under:

```text
docs/task/002_ai_official_source_ingestion/steps/
```

Start with [steps/README.md](steps/README.md), then follow the numbered files from `01_create_feature_branch.md` through `14_pr.md`.

## 3. Validation Plan

Required commands:

```text
npm run typecheck
npm test
npm run sources:validate
npm run ingest:run -- --date=YYYY-MM-DD --db=/tmp/ai-trend-agent-task002.sqlite
```

If network access is unavailable, live ingestion can be deferred, but fixture-backed parser and persistence tests must still pass.

## 4. Risks

- HTML source layouts can change.
- Anthropic may not expose an official RSS feed.
- live-source tests can be flaky.
- social sources are high-volume and lower-trust, so they should not be mixed into the official-source MVP.
- Task 002 depends on Task 001 store and identity contracts.
- The source universe is larger than OpenAI, Anthropic, and Google; non-US labs and open-weight model ecosystems can move quickly and need watch-list coverage.
