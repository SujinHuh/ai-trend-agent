# Source Registry

## 1. 목적

Source Registry는 AI Trend Agent가 수집할 출처를 코드가 아닌 설정으로 관리하기 위한 명세다.

Task 002에서는 공식 출처 중심으로만 시작한다. X/Twitter, Threads, YouTube, 비공식 커뮤니티는 이후 작업에서 allow-list 기반으로 추가한다.

## 2. Source 스키마

```ts
type SourceType = "rss" | "atom" | "html" | "github_releases";
type SourceCategory = "llm_vendor" | "cloud" | "backend" | "developer_tool" | "open_source";
type SourceCredibility = "official" | "official_aggregated" | "trusted_individual" | "community";
type ParserType = "rss_parser" | "atom_parser" | "html_list_parser" | "github_releases_atom";

interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  homepageUrl?: string;
  vendor?: string;
  official?: boolean;
  category: SourceCategory;
  credibility: SourceCredibility;
  parserType?: ParserType;
  timezone?: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  rateLimit?: {
    requestsPerMinute: number;
  };
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
  fetchConfig: {
    timeoutMs: number;
    maxItemsPerFetch: number;
    cacheTtlMinutes: number;
    headers?: Record<string, string>;
  };
  canonicalizationRules?: {
    removeQueryParams: string[];
    stripFragment: boolean;
    stripTrailingSlash: boolean;
    forceHttps: boolean;
  };
  htmlParserConfig?: {
    listSelector: string;
    itemSelector: string;
    titleSelector: string;
    urlSelector: string;
    dateSelector: string;
    authorSelector?: string;
    excerptSelector?: string;
    dateFormatHint?: string;
  };
}
```

선택 필드는 source별 값이 없으면 기본값을 사용한다.

기본값:

```json
{
  "official": true,
  "timezone": "UTC",
  "rateLimit": {
    "requestsPerMinute": 12
  },
  "retry": {
    "maxAttempts": 2,
    "backoffMs": 1000
  },
  "canonicalizationRules": {
    "removeQueryParams": ["utm_*", "fbclid", "gclid", "ref", "source"],
    "stripFragment": true,
    "stripTrailingSlash": true,
    "forceHttps": true
  }
}
```

`htmlParserConfig`는 `type="html"`인 source에만 필요하다.

HTML source별 selector는 실제 구현 중 조정될 수 있으므로, Task 002에서는 다음 원칙을 따른다.

- selector 기반 파싱이 실패하면 해당 source를 `SourceResult.success=false`로 처리한다.
- 실패 source는 전체 리포트 생성을 막지 않는다.
- selector 변경은 Source Registry 수정으로 처리하고 수집 코드에 하드코딩하지 않는다.
- HTML 파서는 JavaScript 렌더링을 요구하지 않는 정적 HTML만 대상으로 한다.

## 3. MVP 초기 출처

초기 구현은 3-5개 공식 출처로 제한한다.

2026-08-01 live validation 기준 enabled MVP source:

- `anthropic-news`
- `mistral-news`
- `huggingface-blog-feed`
- `github-openai-python-releases`

OpenAI News는 서버 환경에서 Cloudflare 403이 재현되어 disabled 상태로 둔다. Google Blog Feed는 `https://blog.google/feed/`가 HTML을 반환해 RSS parser가 유효한 feed로 처리할 수 없으므로 disabled 상태로 둔다. 두 source는 이후 별도 feed URL, 허용 가능한 공식 endpoint, 또는 안정적인 fetch 정책이 확인되면 다시 enabled로 전환한다.

```json
[
  {
    "id": "openai-news",
    "name": "OpenAI News",
    "type": "html",
    "url": "https://openai.com/news/",
    "category": "llm_vendor",
    "credibility": "official",
    "parserType": "html_list_parser",
    "enabled": false,
    "priority": 100,
    "tags": ["openai", "chatgpt", "codex", "api"],
    "fetchConfig": {
      "timeoutMs": 5000,
      "maxItemsPerFetch": 10,
      "cacheTtlMinutes": 60
    },
    "htmlParserConfig": {
      "listSelector": "body",
      "itemSelector": "a[href*='/news/']",
      "titleSelector": "self",
      "urlSelector": "self",
      "dateSelector": "time",
      "excerptSelector": "self",
      "dateFormatHint": "site-specific"
    }
  },
  {
    "id": "anthropic-news",
    "name": "Anthropic News",
    "type": "html",
    "url": "https://www.anthropic.com/news",
    "category": "llm_vendor",
    "credibility": "official",
    "parserType": "html_list_parser",
    "enabled": true,
    "priority": 100,
    "tags": ["anthropic", "claude", "claude-code"],
    "fetchConfig": {
      "timeoutMs": 5000,
      "maxItemsPerFetch": 10,
      "cacheTtlMinutes": 60
    },
    "htmlParserConfig": {
      "listSelector": "body",
      "itemSelector": "a[href*='/news/']",
      "titleSelector": "self",
      "urlSelector": "self",
      "dateSelector": "self",
      "excerptSelector": "self",
      "dateFormatHint": "MMM D, YYYY"
    }
  },
  {
    "id": "google-blog-feed",
    "name": "Google Blog Feed",
    "type": "rss",
    "url": "https://blog.google/feed/",
    "category": "llm_vendor",
    "credibility": "official",
    "parserType": "rss_parser",
    "enabled": false,
    "priority": 90,
    "tags": ["google", "gemini", "ai", "cloud"],
    "fetchConfig": {
      "timeoutMs": 5000,
      "maxItemsPerFetch": 10,
      "cacheTtlMinutes": 60
    }
  },
  {
    "id": "mistral-news",
    "name": "Mistral News",
    "type": "rss",
    "url": "https://mistral.ai/rss.xml",
    "category": "llm_vendor",
    "credibility": "official",
    "parserType": "rss_parser",
    "enabled": true,
    "priority": 84,
    "tags": ["mistral", "model", "agent", "research"],
    "fetchConfig": {
      "timeoutMs": 5000,
      "maxItemsPerFetch": 10,
      "cacheTtlMinutes": 60
    }
  },
  {
    "id": "huggingface-blog-feed",
    "name": "Hugging Face Blog Feed",
    "type": "rss",
    "url": "https://huggingface.co/blog/feed.xml",
    "category": "open_source",
    "credibility": "official",
    "parserType": "rss_parser",
    "enabled": true,
    "priority": 82,
    "tags": ["huggingface", "open-source", "models", "tooling"],
    "fetchConfig": {
      "timeoutMs": 5000,
      "maxItemsPerFetch": 10,
      "cacheTtlMinutes": 60
    }
  },
  {
    "id": "github-openai-python-releases",
    "name": "OpenAI Python GitHub Releases",
    "type": "github_releases",
    "url": "https://github.com/openai/openai-python/releases.atom",
    "category": "developer_tool",
    "credibility": "official",
    "parserType": "github_releases_atom",
    "enabled": true,
    "priority": 70,
    "tags": ["openai", "sdk", "python", "github-releases"],
    "fetchConfig": {
      "timeoutMs": 5000,
      "maxItemsPerFetch": 10,
      "cacheTtlMinutes": 60
    }
  }
]
```

## 4. 부분 실패 정책

한 출처가 실패해도 전체 수집 작업은 실패하지 않는다.

각 Source 실행 결과는 다음 상태를 가진다.

```ts
interface SourceResult {
  sourceId: string;
  success: boolean;
  fetchedAt: string;
  itemCount: number;
  errorMessage?: string;
}
```

리포트에는 성공한 출처의 항목을 포함하고, 실패한 출처는 하단의 `Source Failures` 섹션에 기록한다.

## 5. 로컬 캐시

Task 002는 개발 중 반복 실행 비용을 줄이기 위해 원문 캐시를 지원한다.

기본 캐시 경로:

```text
.cache/sources/YYYY-MM-DD/{sourceId}.json
```

기본 정책:

- `--force-refresh`가 없으면 캐시를 먼저 사용한다.
- 캐시가 없거나 만료되면 네트워크 요청을 수행한다.
- 캐시에는 원문 응답, HTTP 상태, fetchedAt, sourceId를 저장한다.
- API 키나 인증 토큰은 캐시에 저장하지 않는다.
