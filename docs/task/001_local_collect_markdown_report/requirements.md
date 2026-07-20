# Task 001: Local Collect Markdown Report Requirements

## 1. 목표

로컬 명령어로 공식 출처를 수집하고, 날짜 필터링과 canonical URL 중복 제거를 수행한 뒤 Markdown 리포트를 생성한다.

Task 001은 deterministic 영역만 구현한다.

## 2. 포함 범위

- 프로젝트 초기 코드 구조
- Source Registry 로딩
- 공식 출처 3-5개 수집
- RSS, Atom, HTML, GitHub Releases 중 최소 2개 타입 지원
- HTML source는 Source Registry의 `htmlParserConfig`를 기준으로 파싱
- 원문 응답 로컬 캐시
- RawArticle 정규화
- Article 스키마 변환
- KST 날짜 필터링
- canonical URL 중복 제거
- 부분 실패 처리
- Markdown 리포트 생성

## 3. 제외 범위

- OpenAI, Claude, Gemini LLM 호출
- LLM 요약
- LLM 리뷰
- Notion 저장
- TTS 생성
- 이메일 발송
- GCP 배포
- X/Twitter 수집
- Threads 수집
- YouTube 수집
- 유사도 기반 주제 중복 제거

## 4. CLI 명세

예상 명령:

```bash
npm run generate -- --date=2026-07-20
```

옵션:

- `--date=YYYY-MM-DD`: 리포트 기준 날짜. 기본값은 실행 시점의 `Asia/Seoul` 날짜다.
- `--window-start=ISO8601`: 수집 시작 시각 수동 지정.
- `--window-end=ISO8601`: 수집 종료 시각 수동 지정.
- `--hours=N`: 기준 시각에서 N시간 전까지 수집.
- `--force-refresh`: 로컬 캐시를 무시하고 다시 수집.
- `--source=id`: 특정 source만 실행.

옵션 우선순위:

1. `--window-start`와 `--window-end`가 둘 다 있으면 두 값을 그대로 사용한다.
2. `--hours`가 있으면 실행 시점 또는 `--date` 기준 종료 시각에서 N시간 전까지를 사용한다.
3. `--date`만 있으면 기본 KST 운영 윈도우를 사용한다.
4. 아무 옵션이 없으면 실행 시점의 KST 날짜를 `--date`로 간주한다.

`--window-start` 또는 `--window-end` 중 하나만 있으면 오류로 처리한다.

기술 스택 기본값:

- 런타임: Node.js
- 언어: TypeScript
- 패키지 매니저: npm
- Source Registry 설정 파일: `config/sources.json`
- 리포트 출력 경로: `reports/YYYY-MM-DD/markdown-report.md`
- 캐시 경로: `.cache/sources/YYYY-MM-DD/{sourceId}.json`

## 5. 날짜 기준

기준 타임존:

```text
Asia/Seoul
```

기본 운영 기준:

- 리포트 발송 목표 시각: 매일 07:00 KST
- 수집 종료 시각: 당일 06:50 KST
- 가공 버퍼: 10분
- 수집 시작 시각: 전날 07:00 KST

예시:

`--date=2026-07-20`으로 실행하면 기본 수집 윈도우는 다음과 같다.

```text
2026-07-19T07:00:00+09:00 <= effectivePublishedAt < 2026-07-20T06:50:00+09:00
```

날짜 판단 규칙:

- `publishedAt`이 있으면 우선 사용한다.
- `publishedAt`이 없고 `updatedAt`이 있으면 `updatedAt`을 사용한다.
- 둘 다 없으면 `Needs Review` 섹션으로 보낸다.
- 수집 윈도우 밖의 항목은 `Excluded` 섹션으로 보낸다.

## 6. 파이프라인

1. Source Registry를 로드한다.
2. enabled source만 선택한다.
3. 캐시가 있으면 캐시를 읽는다.
4. 캐시가 없거나 `--force-refresh`가 있으면 네트워크로 수집한다.
5. 각 source 응답을 parserType과 parser config 기준으로 RawArticle 배열로 변환한다.
6. RawArticle을 Article로 정규화한다.
7. 필수 필드와 URL 접근성을 검증한다.
8. KST 수집 윈도우로 날짜를 분류한다.
9. canonical URL 기준으로 중복 제거한다.
10. Markdown 리포트를 생성한다.
11. SourceResult와 실패 정보를 리포트 하단에 포함한다.

## 7. 부분 실패 처리

한 source가 실패해도 전체 프로세스는 계속 진행한다.

정책:

- 실패한 source는 `SourceResult.success=false`로 기록한다.
- 실패 이유는 `errorMessage`에 남긴다.
- 성공한 source의 항목만 리포트에 포함한다.
- 모든 source가 실패하면 빈 리포트를 생성하되 exit code는 실패로 둔다.
- HTML selector 파싱 실패는 해당 source 실패로 처리한다.

## 8. 로컬 캐시

캐시 경로:

```text
.cache/sources/YYYY-MM-DD/{sourceId}.json
```

캐시 파일에는 다음을 저장한다.

- sourceId
- fetchedAt
- statusCode
- responseBody
- parsedItemCount
- rawCachePath

## 9. Canonical URL 중복 제거

Task 001의 중복 제거는 같은 주제 판단이 아니라 canonical URL exact match만 수행한다.

정규화 규칙:

- redirect가 확인되면 최종 URL을 `finalUrl`로 저장한다.
- URL scheme은 `https`를 우선한다.
- hostname은 lowercase로 변환한다.
- fragment는 제거한다.
- trailing slash는 제거한다.
- `utm_*`, `fbclid`, `gclid`, `ref`, `source` query parameter는 제거한다.
- 남은 query parameter는 key 기준으로 정렬한다.
- `dedupeKey`는 `sha256(canonicalUrl)`로 생성한다.

대표 항목 선택 규칙:

1. 수집 윈도우 안에 있는 항목을 윈도우 밖 항목보다 우선한다.
2. 둘 다 윈도우 안이면 source priority가 높은 항목을 우선한다.
3. source priority가 같으면 `effectivePublishedAt`이 최신인 항목을 우선한다.
4. 그래도 같으면 먼저 수집된 항목을 우선한다.

중복으로 제거된 항목은 `Excluded` 섹션에 `duplicateOf`를 표시한다.

## 10. Markdown 출력

기본 출력 경로:

```text
reports/YYYY-MM-DD/markdown-report.md
```

필수 섹션:

```text
# AI Trend Report - YYYY-MM-DD

## Window
## Summary
## Included Articles
## Needs Review
## Excluded
## Source Failures
```

Task 001의 `Summary`는 LLM 요약이 아니다.

포함 내용:

- 전체 source 수
- 성공 source 수
- 실패 source 수
- 수집 article 수
- included article 수
- needs review article 수
- excluded article 수

Article 항목 템플릿:

```text
### {title}

- Source: {sourceName}
- Published: {effectivePublishedAt}
- URL: {canonicalUrl}
- Category: {category}
- Status: {verification.status}
- Excerpt: {excerpt}
```

## 11. 수용 기준

- 로컬 명령어로 Markdown 리포트가 생성된다.
- 리포트는 `reports/YYYY-MM-DD/markdown-report.md`에 저장된다.
- 수집 윈도우는 `Asia/Seoul` 기준 전날 07:00부터 당일 06:50 전까지다.
- 같은 canonical URL은 한 번만 포함된다.
- 날짜가 없는 항목은 `Needs Review`로 이동한다.
- 수집 윈도우 밖의 항목은 `Excluded`로 이동한다.
- 일부 source 실패가 전체 리포트 생성을 막지 않는다.
- 모든 source 실패 시 실패 exit code와 실패 로그를 남긴다.
- LLM, Notion, TTS, Email, GCP, 소셜/영상 수집 코드는 포함하지 않는다.
