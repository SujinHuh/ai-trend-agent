# Data Schema

## 1. 공통 원칙

- 시간은 ISO 8601 문자열로 저장한다.
- 기준 타임존은 `Asia/Seoul`이다.
- URL 비교는 `canonicalUrl` 기준으로 한다.
- Task 001에서는 LLM 요약 필드를 생성하지 않는다.
- 값이 없을 수 있는 필드는 명시적으로 `null`을 허용한다.

## 2. Source

Source 스키마는 `docs/source-registry.md`를 따른다.

공통 enum:

```ts
type SourceCategory = "llm_vendor" | "cloud" | "backend" | "developer_tool" | "open_source";
type SourceCredibility = "official" | "official_aggregated" | "trusted_individual" | "community";
```

## 3. RawArticle

수집 직후의 원문 항목이다.

```ts
interface RawArticle {
  sourceId: string;
  sourceType: "rss" | "atom" | "html" | "github_releases";
  rawId: string | null;
  title: string | null;
  url: string | null;
  finalUrl: string | null;
  publishedAtRaw: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  author: string | null;
  excerpt: string | null;
  rawText: string | null;
  rawCachePath: string | null;
  language: string | null;
  fetchStatus: "success";
  httpStatus: number | null;
  errorReason: null;
  fetchedAt: string;
}
```

## 4. Article

정규화된 기사 또는 릴리즈 항목이다.

```ts
interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: "rss" | "atom" | "html" | "github_releases";
  title: string;
  url: string;
  finalUrl: string | null;
  canonicalUrl: string;
  canonicalHash: string;
  urlHash: string;
  contentHash: string | null;
  dedupeKey: string;
  publishedAtRaw: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  effectivePublishedAt: string | null;
  fetchedAt: string;
  rawCachePath: string | null;
  author: string | null;
  excerpt: string | null;
  rawText: string | null;
  language: string | null;
  category: SourceCategory;
  tags: string[];
  credibility: SourceCredibility;
  fetchStatus: "success";
  errorReason: null;
  includedInReport: boolean;
  verification: VerificationResult;
}
```

필수 규칙:

- `id`는 `canonicalHash` 기반으로 생성한다.
- `title`, `url`, `canonicalUrl`, `sourceId`, `fetchedAt`은 필수다.
- `effectivePublishedAt`은 `publishedAt`이 있으면 `publishedAt`, 없으면 `updatedAt`을 사용한다.
- `effectivePublishedAt`도 없으면 메인 리포트가 아니라 `Needs Review` 섹션으로 보낸다.
- `rawText`가 없더라도 제목, URL, 날짜가 있으면 항목은 유지할 수 있다.
- `dedupeKey`는 Task 001에서 `canonicalHash`와 동일하게 둔다.
- `contentHash`는 원문 본문이 있을 때만 생성한다.
- `includedInReport`는 `Included Articles`에 들어간 경우에만 `true`다.
- Article은 성공적으로 수집/정규화된 항목에 대해서만 생성한다.
- source 단위 실패는 Article이 아니라 `SourceResult`로 기록한다.

## 5. Canonical URL

중복 제거는 Task 001에서 canonical URL exact match만 수행한다.

정규화 규칙:

- URL scheme은 `https`를 우선한다.
- hostname은 lowercase로 변환한다.
- fragment는 제거한다.
- trailing slash는 제거한다.
- `utm_*`, `fbclid`, `gclid`, `ref`, `source` 쿼리 파라미터는 제거한다.
- 남은 query parameter는 key 기준으로 정렬한다.

`canonicalHash`는 `sha256(canonicalUrl)`로 생성한다.

## 6. Evidence

요약 또는 리포트 항목의 근거다.

```ts
interface Evidence {
  articleId: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: string;
  publishedAt: string | null;
  fetchedAt: string;
  evidenceExcerpt: string | null;
  confidenceScore: number;
}
```

Task 001에서는 `evidenceExcerpt`에 `excerpt` 또는 `rawText` 앞부분을 사용한다.

`confidenceScore` 범위는 `0.0`부터 `1.0`까지다.

Task 001 기본 계산:

- 공식 출처이고 필수 필드가 있으면 `0.8`
- 날짜가 없어서 `Needs Review`로 이동하면 `0.5`
- URL 접근성이 불명확하면 `0.4`
- excluded 항목은 `0.0`

## 7. VerificationResult

코드 기반 검증 결과다.

```ts
type VerificationStatus = "passed" | "needs_review" | "excluded";

interface VerificationResult {
  status: VerificationStatus;
  reasons: string[];
  urlReachable: boolean | null;
  hasRequiredFields: boolean;
  withinWindow: boolean | null;
  duplicateOf: string | null;
  includedInReport: boolean;
}
```

## 8. Report

Task 001의 리포트 구조다.

```ts
interface Report {
  reportDate: string;
  timezone: "Asia/Seoul";
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  sources: SourceResult[];
  includedArticles: Article[];
  needsReviewArticles: Article[];
  excludedArticles: Article[];
}
```

Markdown 리포트는 이 `Report`를 사람이 읽을 수 있게 변환한 결과물이다.
