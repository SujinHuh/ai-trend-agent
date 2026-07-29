# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `[Draft] LLM Wiki 로컬 저장소 기반 구축`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- SQLite 기반 로컬 LLM Wiki 저장소를 추가
- `TrendItem`, `Digest`, `SourceEvidence`, `digest_trend_items` schema와 repository 구현
- canonical URL 정규화와 stable ID 생성 로직 추가
- `db:init`, `sample:seed`, `digest:get -- --date=YYYY-MM-DD` CLI 추가
- Task 001 요구사항, 구현 순서, 단계 상태, 검증 리포트, completion MD/HTML 추가
- docs 구조를 v2 기준 문서, workflow 문서, archive 문서로 정리

## ❓ 변경 이유

- 이후 AI 공식 출처 수집, 요약/랭킹, Slack 발송, Hermes `/cron`, 웹 뉴스 화면이 모두 같은 저장소 모델을 기준으로 동작해야 함
- 외부 수집이나 LLM 호출 전에 URL 중복 제거, 날짜별 digest 조회, stable ID 같은 핵심 불변조건을 로컬에서 먼저 검증해야 함
- v1 문서와 v2 문서가 섞여 있어 현재 작업 기준을 명확히 분리할 필요가 있음

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트 (`npm test`)
- [x] 타입 체크 (`npm run typecheck`)
- [x] CLI 검증 (`db:init`, `sample:seed`, `digest:get`)
- [x] 문서/요구사항 검수
- [x] completion HTML 외부 URL 확인

검증 결과:

```text
npm run typecheck passed
npm test passed
6 test files passed
19 tests passed
public showcase returned 200 OK
```

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

## 💡 추가 설명

- 실제 외부 출처 수집, LLM 호출, Slack 발송, Hermes `/cron`, GCP 운영 배포, 웹 뉴스 화면은 이번 PR 범위에서 제외
- Task 001 showcase:
  `http://34.22.67.160/ai-trend-agent/showcase/001_llm_wiki_local_store/completion.html`

## 👀 리뷰 요청

- SQLite 기반 LLM Wiki schema가 이후 수집, 요약/랭킹, Slack 발송까지 확장하기에 적절한지 확인 부탁드립니다.
- canonical URL 중복 제거와 stable ID 기준이 장기 저장소 식별자로 충분한지 확인 부탁드립니다.
- docs 구조가 현재 v2 작업과 legacy 참고 문서를 명확히 구분하는지 확인 부탁드립니다.
