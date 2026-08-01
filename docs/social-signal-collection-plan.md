# Social Signal Collection Plan

## 결론

유명 AI 인물/X/Twitter/소셜 신호는 "웹 페이지를 긁는 크롤링"으로 시작하지 않는다. 기본 원칙은 official API, RSS, 공개 JSON API, 수동 export 순서다.

Task 002에서는 수집하지 않는다. Task 007에서 구현하고, Task 003에서는 보조 신호를 `needs_confirmation`으로 해석하는 ranking 정책만 먼저 준비한다.

명확한 답:

- X/Twitter: 크롤링이 아니라 X API 수집으로 설계한다.
- Threads: 크롤링이 아니라 Meta Threads API 또는 수동 export/import로 설계한다.
- Reddit: RSS/API 기반 수집으로 설계한다.
- Hacker News: 공식 Firebase API 기반 수집으로 설계한다.
- 개인 블로그/newsletter: RSS 우선, HTML은 허용 여부 확인 후 제한적으로만 사용한다.

## Collection Matrix

| Channel | Recommended method | Is this crawling? | Auth needed | Task | Default status |
| --- | --- | --- | --- | --- | --- |
| X/Twitter | X API Recent Search `/2/tweets/search/recent`, user query `from:<handle>` | No, official API collection | Yes | Task 007 | `needs_confirmation` |
| X/Twitter full archive | X API Full-Archive Search `/2/tweets/search/all` | No, official API collection | Yes, paid/enterprise-like access may apply | Task 007 later | `needs_confirmation` |
| Threads | Meta Threads API keyword search or authorized user/mention endpoints | No, official API collection | Yes, app/scopes required | Task 007 later | `needs_confirmation` |
| Reddit | Subreddit/search RSS or Reddit API where policy allows | RSS/API collection, not browser scraping | Maybe | Task 007 | `needs_confirmation` |
| Hacker News | Official Firebase API `/v0/newstories`, `/v0/item/<id>.json` plus keyword filter | No, official API collection | No token in current public API | Task 007 | `needs_confirmation` |
| Newsletters | Manual export, RSS where offered, or user-curated source list | No | Depends | Task 007 later | `needs_confirmation` |
| Screenshots/private chat | Do not ingest automatically | No | N/A | Out of scope | discard |

## Official References

- X Search Posts docs: https://docs.x.com/x-api/posts/search/introduction
- X Search Operators docs: https://docs.x.com/x-api/posts/search/integrate/operators
- X full archive endpoint docs: https://docs.x.com/x-api/posts/search-all-posts
- Threads API Postman collection: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- Hacker News official API: https://github.com/HackerNews/API
- Reddit developer platform: https://developers.reddit.com/

## X/Twitter 수집 방식

1. `config/trusted-ai-signals.json`에 allow-list handle을 둔다.
2. query는 handle 단위로 만든다.
3. 기본 query:

```text
from:karpathy (AI OR LLM OR model OR agent OR inference OR "open source") -is:retweet
```

4. API response에서 `id`, `author_id`, `created_at`, `text`, `entities.urls`, `public_metrics`를 저장한다.
5. URL이 공식 vendor blog, GitHub release, arXiv, Hugging Face, benchmark page로 이어지면 source lineage 후보로 연결한다.
6. X 단독 주장에는 `confirmationStatus: "needs_confirmation"`을 부여한다.

## Threads 수집 방식

1. Threads는 API access와 scope 확인 전까지 disabled다.
2. keyword search 또는 authorized account 기반 endpoint만 사용한다.
3. scraping/proxy/cookie 기반 third-party API는 MVP에서 제외한다.
4. output shape는 X와 동일한 social signal shape로 정규화한다.

## Reddit 수집 방식

1. 우선 RSS를 사용한다.
2. 후보 URL:

```text
https://www.reddit.com/r/LocalLLaMA/new/.rss
https://www.reddit.com/r/MachineLearning/new/.rss
https://www.reddit.com/r/artificial/new/.rss
https://www.reddit.com/r/OpenAI/new/.rss
https://www.reddit.com/r/ClaudeAI/new/.rss
```

3. keyword filter는 title/link/domain 기준으로 적용한다.
4. Reddit 단독 주장은 `needs_confirmation`이다.
5. upvote/comment count는 velocity signal로만 쓰고 사실 confidence로 쓰지 않는다.

## Hacker News 수집 방식

1. 공식 Firebase API에서 `newstories` 또는 `topstories` id 목록을 가져온다.
2. 각 item을 `/v0/item/<id>.json`으로 가져온다.
3. title/url/text에 keyword filter를 적용한다.
4. 공식 URL을 포함한 story는 source lineage 후보로 연결한다.
5. HN discussion 자체는 `community` credibility다.

## Suggested Config Shape

```json
{
  "trustedIndividuals": [
    {
      "id": "karpathy",
      "name": "Andrej Karpathy",
      "platform": "x",
      "handle": "karpathy",
      "credibility": "trusted_individual",
      "enabled": false,
      "priority": 100,
      "tags": ["llm", "agents", "education"],
      "defaultStatus": "needs_confirmation"
    }
  ],
  "officialSocialAccounts": [
    {
      "id": "kimi-moonshot-x",
      "name": "Kimi / Moonshot AI",
      "platform": "x",
      "handle": "Kimi_Moonshot",
      "credibility": "official_aggregated",
      "enabled": false,
      "priority": 90,
      "defaultStatus": "needs_confirmation"
    }
  ],
  "communitySources": [
    {
      "id": "reddit-local-llama",
      "platform": "reddit_rss",
      "url": "https://www.reddit.com/r/LocalLLaMA/new/.rss",
      "credibility": "community",
      "enabled": false,
      "defaultStatus": "needs_confirmation"
    }
  ]
}
```

## Security and Policy Rules

1. API token은 config에 저장하지 않는다.
2. `.env` 또는 Secret Manager만 사용한다.
3. raw social response는 cache에 저장하되 private token/header는 저장하지 않는다.
4. robots/terms 우회용 browser scraping은 하지 않는다.
5. rate limit 초과 시 source-level failure로 기록하고 전체 run은 계속한다.
6. social signal은 Slack digest에서 confirmed fact처럼 쓰지 않는다.
7. 사용자가 직접 제공한 링크/export는 source lineage에 `manual_input`으로 기록한다.

## Task 007 Handoff

- [Task 007 Requirements](task/007_social_allow_list/requirements.md)
- [Task 007 Implementation Sequence](task/007_social_allow_list/implementation-sequence.md)
- [Task 007 Phase Status](task/007_social_allow_list/phase_status.md)
