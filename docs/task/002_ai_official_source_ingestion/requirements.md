# Task 002 Requirements - AI Official Source Ingestion

## 1. Purpose

Task 002 collects recent updates from official AI sources and stores normalized items in the existing LLM Wiki local store created by Task 001.

The goal is not to rank, summarize, or send the items yet. The goal is to create a reliable ingestion boundary that later tasks can reuse for ranking, Slack delivery, Hermes `/cron`, and web views.

## 1.1 User Context

The user is a solo developer. The system and Codex feedback should assume that AI trend flow can move faster than one person can manually track.

Practical implications:

- feedback should clearly separate "do now", "do next", and "watch later".
- source recommendations should not stop at OpenAI, Anthropic, and Google.
- fast-moving model labs such as Moonshot AI Kimi, DeepSeek, Qwen, Zhipu, Mistral, xAI, Meta, Hugging Face, and open-source model ecosystems should be visible in the backlog.
- lower-trust social/community signals should be marked as "needs confirmation", not treated as facts.
- when a new model appears, the workflow should preserve the source link, date, model name, and why a solo developer should care.

## 2. Scope

Included:

- Source Registry config loading
- official AI source definitions
- RSS, Atom, GitHub Releases Atom, and static HTML parsing
- HTTP fetch with timeout, retry, and local cache
- raw response snapshot storage
- KST report-window filtering
- source-level partial failure handling
- canonical URL and stable ID reuse from Task 001
- saving ingested items as `TrendItem` and `SourceEvidence`
- local ingestion CLI
- parser, cache, failure, dedupe, and persistence tests
- validation report

Excluded:

- LLM summarization
- importance ranking
- urgent alert scoring
- Slack delivery
- Hermes `/cron`
- GCP deployment
- web UI
- broad social ingestion from X, Threads, Reddit, YouTube, or unofficial communities

## 3. Initial MVP Sources

Task 002 starts with a small official-source set so parser behavior and persistence invariants can be validated without a firehose.

Required enabled sources:

1. OpenAI News
2. Anthropic News
3. Google AI Blog or Google Blog Feed
4. OpenAI Python GitHub Releases

Optional enabled source if the parser remains stable:

5. Google DeepMind Blog

Optional disabled source for later domain expansion:

6. Spring News and Events

## 4. Source Candidate Backlog

These sources should be recorded in Source Registry or a source candidate list, but not all enabled in Task 002.

Official AI labs and vendors:

1. OpenAI News
2. OpenAI API or platform release notes
3. OpenAI official status
4. Anthropic News
5. Anthropic status
6. Google AI Blog
7. Google DeepMind Blog
8. Google Research Blog
9. Google Developers Blog
10. Google Cloud AI Blog
11. Meta AI Blog
12. Microsoft AI Blog
13. Azure AI Blog
14. GitHub Blog - AI and Copilot
15. Hugging Face Blog
16. Mistral AI News
17. Cohere Blog
18. xAI News
19. Perplexity Blog
20. Stability AI News
21. Moonshot AI / Kimi announcements
22. MoonshotAI GitHub releases and model repositories
23. DeepSeek transparency and API changelog
24. Qwen blog and QwenCloud model changelog
25. Zhipu / GLM model announcements
26. MiniMax model announcements
27. Baichuan model announcements
28. Together AI blog
29. Fireworks AI blog
30. Replicate changelog
31. OpenRouter model announcements
32. Artificial Analysis model leaderboard updates

Developer tooling and release feeds:

1. OpenAI Python releases
2. OpenAI Node releases
3. Anthropic SDK releases
4. Vercel AI SDK releases
5. LangChain releases
6. LlamaIndex releases
7. Hugging Face Transformers releases
8. Ollama releases
9. vLLM releases
10. LiteLLM releases
11. Cursor changelog
12. Windsurf changelog
13. GitHub Copilot changelog
14. Claude Code changelog
15. Codex release notes
16. Kimi Code or Moonshot coding-agent releases
17. Qwen Code releases
18. Aider releases
19. Roo Code releases
20. Continue releases

Research and open-source candidates:

1. arXiv cs.AI
2. arXiv cs.CL
3. arXiv cs.LG
4. Hugging Face Daily Papers
5. Papers with Code
6. GitHub Trending AI keyword scan
7. Hacker News official API keyword scan
8. Hacker News AI RSS mirror
9. Papers with Code trending
10. LMSYS or Chatbot Arena leaderboard updates
11. Artificial Analysis leaderboard updates
12. Vals AI benchmark updates
13. SWE-bench leaderboard updates
14. Hugging Face model trending
15. Hugging Face spaces trending

Community and social allow-list candidates for later tasks:

1. Reddit r/MachineLearning
2. Reddit r/LocalLLaMA
3. Reddit r/artificial
4. Reddit r/OpenAI
5. Reddit r/ChatGPT
6. Reddit r/ClaudeAI
7. Reddit r/ClaudeCode
8. Hacker News AI keyword feed
9. X/Twitter official handles and trusted researchers
10. Threads official handles and trusted researchers
11. Bluesky AI researchers and lab accounts
12. Mastodon AI researchers and lab accounts
13. Moonshot AI / Kimi researchers and maintainers
14. DeepSeek researchers and maintainers
15. Qwen researchers and maintainers
16. Zhipu / GLM researchers and maintainers
17. Mistral researchers and maintainers
18. Hugging Face maintainers
19. LangChain and LlamaIndex maintainers
20. AI engineering newsletter authors

## 5. Source Trust Policy

Task 002 only writes official or official-like source items into the main included set.

Credibility handling:

- `official`: vendor blog, status page, official release notes, official GitHub release feed
- `official_aggregated`: official content mirrored through a third-party feed
- `trusted_individual`: known researcher, founder, maintainer, or engineer
- `community`: Reddit, Hacker News, social posts, or forum discussions

Task 002 should enable `official` sources first. `trusted_individual` and `community` sources belong to later allow-list expansion unless explicitly enabled for manual review only.

## 6. Ingestion Rules

Required item fields:

- `sourceId`
- `sourceName`
- `title`
- `url`
- `canonicalUrl`
- `canonicalHash`
- `fetchedAt`

Date handling:

- `publishedAt` is preferred.
- `updatedAt` can be used when `publishedAt` is missing.
- `effectivePublishedAt` is `publishedAt` or `updatedAt`.
- items without an effective date must not be silently discarded; they should be marked for review or excluded with a reason.

Deduplication:

- canonical URL rules from Task 001 must be reused.
- stable ID generation from Task 001 must be reused.
- duplicate canonical URLs must update or reuse the same `TrendItem`.

Failure handling:

- one source failure must not fail the whole ingestion run.
- source failures must include `sourceId`, `fetchedAt`, `itemCount`, and `errorMessage`.
- HTML selector failures are source-level failures.

## 7. CLI Requirements

Recommended commands:

```text
npm run sources:validate
npm run ingest:run -- --date=YYYY-MM-DD
npm run ingest:run -- --date=YYYY-MM-DD --force-refresh
npm run ingest:run -- --date=YYYY-MM-DD --db=PATH
```

CLI output must include:

- report date
- source results
- inserted or updated item count
- failed source count
- DB path
- cache usage

## 8. Acceptance Criteria

- source configs validate from a fresh checkout.
- RSS, Atom, GitHub Releases Atom, and static HTML parser paths are covered by tests.
- raw snapshots are cached under `.cache/sources/YYYY-MM-DD/{sourceId}.json`.
- `--force-refresh` bypasses cache.
- partial source failures are reported without aborting the whole run.
- canonical URL duplicate prevention reuses Task 001 behavior.
- official-source items are saved as `TrendItem` plus `SourceEvidence`.
- no LLM, ranking, Slack, Hermes, GCP, or UI behavior is introduced.
- `npm run typecheck` passes.
- `npm test` passes.
- `validation_report.md` records commands, counts, failures, DB path, and remaining risks.
