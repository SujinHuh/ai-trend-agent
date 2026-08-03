# Task 010 계획 - 웹 뉴스 화면

## 구현 전략

1. 기존 schema를 변경하지 않고 Digest membership과 같은 날짜 assessment를 읽는 조회 API를 추가한다.
2. Source Registry를 이름 기준 metadata index로 변환해 domain과 tag를 붙인다.
3. 조회 결과를 순수 view model 함수에서 정렬, 검색, 필터링한다.
4. 사용자 입력과 DB 문자열을 escape하는 서버 렌더러로 HTML을 만든다.
5. 기존 worker와 분리된 read-only news HTTP server에 `/news`와 `/healthz`를 연결한다.
6. GCE persistent disk DB와 nginx public path를 사용하고 private Cloud Run cron은 변경하지 않는다.
7. store, view model, renderer, HTTP, CLI, cron regression 테스트를 구현과 함께 추가한다.

## URL 계약

```text
GET /news
GET /news?date=YYYY-MM-DD
GET /news?date=YYYY-MM-DD&q=agent
GET /news?date=YYYY-MM-DD&domain=ai&category=model&source=OpenAI%20News
GET /healthz
```

## 설계 원칙

- 화면은 읽기 전용이며 공개 route에서 DB write를 호출하지 않는다.
- JavaScript 없이도 링크와 GET form으로 핵심 탐색이 동작한다.
- 필터 option과 결과는 현재 선택된 digest 데이터에서 계산한다.
- source metadata는 registry에서 파생하고 누락 시 명시적 fallback을 사용한다.
- public news process는 Slack/cron secret을 받지 않고 SQLite를 read-only로 연다.
- cron 인증과 Cloud Run IAM 계약은 기존 서비스에 그대로 남는다.
- 별도 프레임워크를 추가하지 않고 현재 Node.js build/deploy 구조를 유지한다.

## 검증

```text
npm run typecheck
npm run build
npm test
git diff --check
```
