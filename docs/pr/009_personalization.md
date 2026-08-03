# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 009: Slack 피드백과 개인화`

- [x] 신규 기능 추가
- [x] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- `UserInterestProfile`과 append-only `PersonalizationFeedback` SQLite 저장을 추가했습니다.
- `interested`, `save_later`, `hide`, muted tag, blocked keyword 기반 deterministic personalization을 구현했습니다.
- 전체 후보 pool을 개인화한 뒤 최종 limit을 적용해 base top-N 밖 관심 후보도 승격할 수 있습니다.
- feedback 시각을 UTC ISO로 정규화하고 profile KST 발송 시각을 report cutoff로 사용합니다.
- Slack build/send, Hermes cron에 선택적 `userProfileId`를 연결했습니다.
- profile update/get, feedback record, personalization preview CLI를 추가했습니다.

## ❓ 변경 이유

- Task 009 완료 기준인 사용자 피드백 저장과 다음 digest 랭킹 반영을 충족하기 위해서입니다.
- base importance와 trust policy를 변경하지 않으면서 사용자별 노출 순서를 안전하게 조정하기 위해서입니다.
- Slack Bot API를 도입하기 전에 storage와 ranking contract를 검증하기 위해서입니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck: passed
npm run build: passed
npm test -- --run: 23 files / 166 tests passed
git diff --check: passed
GCP completion HTML: HTTP 200, Task 009 body confirmed
```

테스트 범위:

- 단위: tag boost, latest action, hide/mute/block, stable ordering, KST cutoff
- 저장소: profile normalization, feedback idempotency, timezone ordering, schema constraints
- 통합/CLI: profile update/get, feedback retry, personalization preview
- 회귀: Slack build/send, cron dry-run/send, domain filtering, full CLI suite
- upgrade: SQLite user version 7에서 8로 additive upgrade와 기존 데이터 보존

제외한 테스트:

- 실제 Slack OAuth/Bot 설치와 interactive action
- 실제 사용자 데이터
- 외부 Slack interaction endpoint

## 🔗 연관 이슈

- v2 Task 009 Slack 피드백과 개인화

## 💡 추가 설명

- 완료 보고서: http://34.22.67.160/ai-trend-agent/showcase/009_personalization/completion.html
- 검증 보고서: `docs/task/009_personalization/validation_report.md`
- Slack interactive endpoint는 raw-body HMAC, replay 방어, team/user allow-list가 필요한 후속 보안 범위입니다.
- item-level tag persistence는 후속 ingestion/schema 확장 범위입니다.

## 👀 리뷰 요청

- same-event retry가 순차·동시 경로에서 멱등한지 확인 부탁드립니다.
- profile 발송 시각 cutoff가 과거 digest payload를 안정적으로 유지하는지 확인 부탁드립니다.
- profile 미지정 Slack/cron 경로가 기존 동작을 유지하는지 확인 부탁드립니다.
