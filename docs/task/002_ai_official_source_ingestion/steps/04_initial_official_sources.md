# Step 4 - Initial Official Sources

## Purpose

Define the first official AI sources that Task 002 will ingest.

The goal is to start small enough to validate the ingestion pipeline, while keeping a broader watch-list for fast-moving AI trends that matter to a solo developer.

## Enabled MVP Sources

These sources should be enabled first.

| Source ID | Source | URL | Type | Parser | Priority | Why |
| --- | --- | --- | --- | --- | --- | --- |
| `openai-news` | OpenAI News | `https://openai.com/news/` | `html` | `html_list_parser` | 100 | Primary OpenAI product, model, safety, enterprise, and research announcements. |
| `anthropic-news` | Anthropic News | `https://www.anthropic.com/news` | `html` | `html_list_parser` | 100 | Primary Claude, Claude Code, product, safety, and research announcements. |
| `google-blog-feed` | Google Blog Feed | `https://blog.google/feed/` | `rss` | `rss_parser` | 90 | Broad Google product and AI announcements; filter by AI/Gemini/cloud tags during normalization. |
| `github-openai-python-releases` | OpenAI Python GitHub Releases | `https://github.com/openai/openai-python/releases.atom` | `github_releases` | `github_releases_atom` | 70 | Official SDK changes can affect developer code directly. |

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

1. OpenAI News
2. Anthropic News
3. Google Blog Feed
4. OpenAI Python GitHub Releases

### Tier 2 - Next Official Sources

These should be the first expansion after parser and cache behavior are stable.

| Source ID | Source | URL | Suggested Type | Why |
| --- | --- | --- | --- | --- |
| `mistral-news` | Mistral News | `https://mistral.ai/news/` | `html` | Important model, agent, research, and enterprise AI updates. |
| `meta-ai-blog` | Meta AI Blog | `https://ai.meta.com/blog/` | `html` | Open model, multimodal, research, and AI infrastructure updates. |
| `huggingface-blog-feed` | Hugging Face Blog Feed | `https://huggingface.co/blog/feed.xml` | `rss` | Strong signal for open model ecosystem, tooling, and community adoption. |
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

## Expansion Rule

Do not enable every source at once.

Recommended order:

1. Implement and validate Tier 1.
2. Add Tier 2 official sources.
3. Add Tier 3 model-lab watch-list sources.
4. Add Tier 4 benchmark/research signals.
5. Add Tier 5 community/social signals as `needs confirmation`.

Each new tier should keep partial failure behavior. One broken source must not block the whole daily digest.

## Disabled Backlog Sources

These should be recorded but disabled in Task 002 until the MVP pipeline is stable.

| Source ID | Source | Suggested Type | Why Disabled Initially |
| --- | --- | --- | --- |
| `moonshot-kimi-blog` | Moonshot AI / Kimi Blog | `html` | Important for Kimi/Kimi K-series updates, but source language and layout need a separate parser review. |
| `kimi-k3-page` | Kimi K3 page | `html` | High-value current model signal, but model pages are less feed-like than news indexes. |
| `deepseek-api-updates` | DeepSeek API Change Log | `html` | Important model/API updates, but should be added after MVP HTML parser proves stable. |
| `qwen-blog` | Qwen Blog | `html` | Important open-weight model updates, but source shape should be validated separately. |
| `mistral-news` | Mistral News | `html` | Strong official vendor source; can be next enabled source after initial 4. |
| `meta-ai-blog` | Meta AI Blog | `html` | Important open model source; add after initial HTML parser hardening. |
| `huggingface-blog` | Hugging Face Blog | `rss` or `html` | Important ecosystem source, but high volume needs filtering. |
| `spring-news` | Spring News | `html` | Backend domain, not AI MVP scope. |

## Configuration Rules

- enabled MVP sources must have `credibility: "official"`.
- community and social sources must not be enabled in Task 002.
- source config must include `fetchConfig.timeoutMs`, `maxItemsPerFetch`, and `cacheTtlMinutes`.
- HTML sources must include `htmlParserConfig`.
- disabled backlog sources may be documented without being implemented in config.

## Review Checklist

- enabled source list matches Task 002 MVP scope.
- disabled backlog includes Kimi, DeepSeek, Qwen, Mistral, Meta, and Hugging Face candidates.
- expansion tiers cover official labs, open model ecosystems, coding tools, benchmarks, research, and community signals.
- parser type is explicit for each enabled source.
- social/community sources are not mixed into the official MVP.
- Spring remains disabled.

## Done Criteria

- source config contains the enabled MVP sources.
- `npm run sources:validate` passes.
- source configs are covered by tests.
- live-source parser risk is recorded in `validation_report.md`.
