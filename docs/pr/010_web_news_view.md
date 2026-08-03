# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 010: 읽기 전용 웹 뉴스 화면`

- [x] 신규 기능 추가
- [x] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [x] 기타: GCE systemd/nginx 배포

## 🔍 변경 내용 요약

- LLM Wiki Digest를 날짜별로 조회하는 read-only store contract를 추가했습니다.
- 중요도/신뢰도 정렬, 날짜 이동, 검색과 domain/category/source 조합 필터를 구현했습니다.
- DB 문자열 escape, 안전한 원문 링크, 빈/오류 상태를 포함한 서버 렌더링 HTML을 추가했습니다.
- `/news`, `/healthz` 전용 HTTP server와 `news:serve` CLI를 기존 private cron worker와 분리했습니다.
- 전용 nologin 계정, loopback bind, read-only SQLite online-backup snapshot, atomic publish를 적용했습니다.
- GCE systemd service와 nginx exact route를 설치하고 public news/health/showcase를 확인했습니다.

## ❓ 변경 이유

- Slack 외에도 LLM Wiki의 날짜별 Top Signals와 근거를 브라우저에서 탐색할 시작점이 필요합니다.
- 공개 조회 화면이 private cron/Slack secret과 writer DB 권한을 공유하지 않도록 운영 경계를 분리해야 합니다.
- 기존 Node/SQLite 구조를 유지하면서 JavaScript 없이도 검색·필터·원문 이동이 가능하게 하기 위해서입니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [x] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

```text
npm run typecheck: passed
npm run build: passed
npm test: 27 files / 203 tests passed
git diff --check: passed
Playwright desktop/mobile/empty-error scenarios: 3 passed
GCE news: HTTP 200, expected digest body confirmed
GCE healthz: HTTP 200, expected JSON confirmed
GCE cron paths: HTTP 404
GCE completion HTML: HTTP 200, Task 010 body confirmed
```

테스트 범위:

- store: read-only SQLite, digest date/membership, same-date assessment와 lineage
- view model: null-last ordering, query와 조합 filter, metadata fallback, 입력 제한
- renderer: HTML escape, http(s) URL, base path, empty state, responsive semantics
- HTTP/CLI: 200/400/404/500/503, HEAD/security headers, loopback bind, external DB guard
- deployment: unit/nginx contract, online backup/integrity, atomic snapshot publish
- 회귀: cron, Slack, ingestion, synthesis, personalization 전체 suite

## 🔗 연관 이슈

- v2 Task 010 웹 뉴스 화면

## 💡 추가 설명

- 뉴스: http://34.22.67.160/ai-trend-agent/news
- health: http://34.22.67.160/ai-trend-agent/news/healthz
- 완료 보고서: http://34.22.67.160/ai-trend-agent/showcase/010_web_news_view/completion.html
- 검증 보고서: `docs/task/010_web_news_view/validation_report.md`
- 공개 DB는 online-backup snapshot이며 writer cycle 뒤 installer를 재실행해 갱신합니다.
- 로그인, feedback/profile 편집과 자동 snapshot schedule은 후속 범위입니다.

## 👀 리뷰 요청

- public news process가 cron/Slack secret과 write 권한에서 충분히 분리됐는지 확인 부탁드립니다.
- nginx exact route와 `127.0.0.1:4174` bind가 `/cron`을 공개하지 않는지 확인 부탁드립니다.
- query validation, HTML escape, source metadata fallback이 요구사항과 일치하는지 확인 부탁드립니다.
