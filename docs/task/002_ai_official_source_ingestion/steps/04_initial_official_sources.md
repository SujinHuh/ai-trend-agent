# Step 4 - Initial Official Sources

## Purpose

Define the first official AI sources that Task 002 will ingest.

The goal is to start small enough to validate the ingestion pipeline, while keeping a broader watch-list for fast-moving AI trends that matter to a solo developer.

## Enabled MVP Sources

These sources should be enabled first.

| Source ID | Source | URL | Type | Parser | Priority | Why |
| --- | --- | --- | --- | --- | --- | --- |
| `anthropic-news` | Anthropic News | `https://www.anthropic.com/news` | `html` | `html_list_parser` | 100 | Primary Claude, Claude Code, product, safety, and research announcements. |
| `mistral-news` | Mistral News | `https://mistral.ai/rss.xml` | `rss` | `rss_parser` | 84 | Important model, agent, research, and enterprise AI updates with a live-valid RSS endpoint. |
| `huggingface-blog-feed` | Hugging Face Blog Feed | `https://huggingface.co/blog/feed.xml` | `rss` | `rss_parser` | 82 | Strong signal for open model ecosystem, tooling, and community adoption. |
| `github-openai-python-releases` | OpenAI Python GitHub Releases | `https://github.com/openai/openai-python/releases.atom` | `github_releases` | `github_releases_atom` | 70 | Official SDK changes can affect developer code directly. |

## Disabled After Live Validation

| Source ID | Source | URL | Why Disabled |
| --- | --- | --- | --- |
| `openai-news` | OpenAI News | `https://openai.com/news/` | 2026-08-01 server-side fetch returned HTTP 403. Keep as backlog until a reliable official endpoint or fetch policy is confirmed. |
| `google-blog-feed` | Google Blog Feed | `https://blog.google/feed/` | 2026-08-01 live response returned HTML instead of RSS. Keep disabled until a valid official feed URL is confirmed. |

## Optional MVP Source

Enable only if parser validation is stable.

| Source ID | Source | URL | Type | Parser | Priority | Why |
| --- | --- | --- | --- | --- | --- | --- |
| `google-deepmind-blog` | Google DeepMind Blog | `https://deepmind.google/discover/blog/` | `html` | `html_list_parser` | 85 | Research and model announcements can be important but HTML parsing may drift. |

## Coverage Verdict

The enabled MVP sources are enough to validate the ingestion pipeline, but they are not enough for broad AI trend awareness.

For the user's goal, Task 002 should keep the first enabled set small and reliable, then immediately maintain a wider source backlog. This prevents the first implementation from becoming unstable while still making sure fast-moving AI signals are not forgotten.

Coverage judgment:

- Stable MVP ingestion: sufficient with 4 enabled sources.
- Broad AI trend awareness: not sufficient unless the expansion tiers below are tracked.
- Solo developer usefulness: sufficient only if each source is reported as `do now`, `do next`, `watch later`, or `needs confirmation`.

## Expansion Source Tiers

### Tier 1 - Enabled First

These sources are enabled to prove the pipeline.

1. Anthropic News
2. Mistral RSS
3. Hugging Face Blog Feed
4. OpenAI Python GitHub Releases

### Tier 2 - Next Official Sources

These should be the first expansion after parser and cache behavior are stable.

| Source ID | Source | URL | Suggested Type | Why |
| --- | --- | --- | --- | --- |
| `meta-ai-blog` | Meta AI Blog | `https://ai.meta.com/blog/` | `html` | Open model, multimodal, research, and AI infrastructure updates. |
| `github-changelog-copilot` | GitHub Changelog - Copilot | `https://github.blog/changelog/` | `html` or `rss` | Coding-agent and Copilot changes directly affect solo developer workflow. |
| `microsoft-ai-blog` | Microsoft AI Blog | `https://www.microsoft.com/en-us/ai/blog/` | `html` | Azure AI, Copilot, enterprise AI, and platform changes. |

### Tier 3 - Fast Model Lab Watch-List

These are high-value model sources, but they need parser and trust handling before enabling.

| Source ID | Source | URL | Suggested Type | Why |
| --- | --- | --- | --- | --- |
| `moonshot-kimi-blog` | Moonshot AI / Kimi Blog | `https://platform.kimi.com/blog` | `html` | Kimi/K-series updates can move quickly and matter for cost, coding, and long-context workflows. |
| `kimi-k3-page` | Kimi K3 Page | `https://www.kimi.com/tr/blog/kimi-k3` | `html` | High-value model announcement page; not a normal feed. |
| `deepseek-api-updates` | DeepSeek API Updates | `https://api-docs.deepseek.com/updates` | `html` | API/model version changes can affect OpenAI-compatible workflows. |
| `qwen-blog` | Qwen Blog | `https://qwenlm.github.io/blog/` | `html` | Qwen model releases are important for open-weight and coding model coverage. |
| `zhipu-glm-watch` | Zhipu / GLM Updates | TBD | `html` | Important non-US model lab coverage; source shape needs confirmation. |

### Tier 4 - Benchmarks and Research Signals

These help detect important models even when vendor blogs are slow.

| Source ID | Source | URL | Suggested Type | Why |
| --- | --- | --- | --- | --- |
| `lmarena-updates` | LM Arena / Chatbot Arena | `https://lmarena.ai/` | `html` | Model quality signal based on public comparisons. |
| `swebench-leaderboard` | SWE-bench Leaderboard | `https://www.swebench.com/` | `html` | Coding-agent capability signal. |
| `artificial-analysis` | Artificial Analysis | `https://artificialanalysis.ai/` | `html` | Model pricing, speed, and quality comparison signal. |
| `arxiv-cs-ai` | arXiv cs.AI | `https://export.arxiv.org/rss/cs.AI` | `rss` | Research signal. |
| `arxiv-cs-cl` | arXiv cs.CL | `https://export.arxiv.org/rss/cs.CL` | `rss` | LLM and NLP research signal. |
| `arxiv-cs-lg` | arXiv cs.LG | `https://export.arxiv.org/rss/cs.LG` | `rss` | ML research signal. |

### Tier 5 - Community and Social Needs-Confirmation Signals

These can catch fast trend movement, but they should never be treated as confirmed facts without official or trusted-source confirmation.

| Source ID | Source | Suggested Type | Why |
| --- | --- | --- | --- |
| `hacker-news-ai-keywords` | Hacker News keyword scan | API or RSS | Early developer discussion around new models, tools, and incidents. |
| `reddit-local-llama` | Reddit r/LocalLLaMA | RSS | Open model and local inference signal. |
| `reddit-machine-learning` | Reddit r/MachineLearning | RSS | Research and ML community signal. |
| `reddit-artificial` | Reddit r/artificial | RSS | Broad AI discussion signal. |
| `x-trusted-ai-allow-list` | X trusted AI allow-list | API or external export | Fastest researcher/lab signal, especially for Chinese AI researchers and open-weight releases. |
| `threads-trusted-ai-allow-list` | Threads trusted AI allow-list | API or external export | Useful only if API access and allowed public search behavior are confirmed. |

Detailed allow-list candidate document:

- [Trusted AI Signal Watchlist](../../../trusted-ai-signal-watchlist.md)

## Expansion Rule

Do not enable every source at once.

Recommended order:

1. Implement and validate Tier 1.
2. Add Tier 2 official sources.
3. Add Tier 3 model-lab watch-list sources.
4. Add Tier 4 benchmark/research signals.
5. Add Tier 5 community/social signals as `needs confirmation`.

Each new tier should keep partial failure behavior. One broken source must not block the whole daily digest.

Karpathy LLM Wiki 적용 기준:

- source ingestion은 raw source를 보존한다.
- ranking/summarization은 wiki synthesis layer를 만든다.
- social signal은 빠른 감지용 source lineage로 남기되, official confirmation 전에는 사실로 승격하지 않는다.
- 정기 lint에서 stale claim, contradiction, orphan tag, unconfirmed signal을 확인한다.

## Disabled Backlog Sources

These should be recorded but disabled in Task 002 until the MVP pipeline is stable.

| Source ID | Source | Suggested Type | Why Disabled Initially |
| --- | --- | --- | --- |
| `moonshot-kimi-blog` | Moonshot AI / Kimi Blog | `html` | Important for Kimi/Kimi K-series updates, but source language and layout need a separate parser review. |
| `kimi-k3-page` | Kimi K3 page | `html` | High-value current model signal, but model pages are less feed-like than news indexes. |
| `deepseek-api-updates` | DeepSeek API Change Log | `html` | Important model/API updates, but should be added after MVP HTML parser proves stable. |
| `qwen-blog` | Qwen Blog | `html` | Important open-weight model updates, but source shape should be validated separately. |
| `meta-ai-blog` | Meta AI Blog | `html` | Important open model source; add after initial HTML parser hardening. |
| `spring-news` | Spring News | `html` | Backend domain, not AI MVP scope. |

## Configuration Rules

- enabled MVP sources must have `credibility: "official"`.
- community and social sources must not be enabled in Task 002.
- source config must include `fetchConfig.timeoutMs`, `maxItemsPerFetch`, and `cacheTtlMinutes`.
- HTML sources must include `htmlParserConfig`.
- disabled backlog sources may be documented without being implemented in config.

## Review Checklist

- enabled source list matches Task 002 MVP scope.
- disabled backlog includes Kimi, DeepSeek, Qwen, Meta, OpenAI News, Google Blog Feed, and Spring candidates.
- expansion tiers cover official labs, open model ecosystems, coding tools, benchmarks, research, and community signals.
- parser type is explicit for each enabled source.
- social/community sources are not mixed into the official MVP.
- Spring remains disabled.

## Done Criteria

- source config contains the enabled MVP sources.
- `npm run sources:validate` passes.
- source configs are covered by tests.
- live-source parser risk is recorded in `validation_report.md`.
