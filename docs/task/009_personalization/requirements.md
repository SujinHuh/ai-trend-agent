# Task 009 요구사항 - Slack 피드백과 개인화

## 목표

사용자의 비민감 피드백을 저장하고 다음 digest 후보 순서와 노출 여부에 반영한다.

## 포함 범위

- `UserInterestProfile`과 feedback event SQLite 저장
- `interested`, `save_later`, `hide` 피드백 기록
- 선호 태그와 `mutedTags` 관리
- 프로필 기반 deterministic reranking
- 숨긴 항목과 muted tag 후보 제외
- CLI feedback 기록, profile 조회, 개인화 preview
- 기존 Slack Incoming Webhook 발송 경로의 선택적 개인화

Task 009의 관심 태그는 현재 영속화된 `trendCategory`, source registry `tags`, source `domain`으로 제한한다. 수집 item별 tag 영속화는 schema와 ingestion 범위가 추가로 필요하므로 후속 확장으로 둔다.

## 제외 범위

- Slack OAuth 설치 흐름
- Slack Bot token 발급과 보관
- Slack interaction request 서명 검증 HTTP endpoint
- 사용자별 DM 또는 멀티 워크스페이스 발송
- LLM을 사용한 개인화 추론
- Task 010 웹 화면

Slack Bot API와 interactive action endpoint는 앱 설정, Signing Secret, OAuth scope, 공개 HTTPS endpoint 운영이 준비된 후 확장한다. Task 009 MVP는 같은 feedback contract를 CLI와 내부 API로 먼저 검증한다.

## 기능 요구사항

1. 기본 프로필은 사용자 ID별로 생성하거나 조회할 수 있어야 한다.
2. 피드백은 사용자, 항목, action, 시각을 보존해야 한다.
3. 같은 사용자의 같은 항목에 대한 최신 action이 개인화 판단에 사용돼야 한다.
4. `interested`는 관련 category/source tag의 점수를 높인다.
5. `save_later`는 작은 양의 가중치를 적용한다.
6. `hide`는 해당 항목을 다음 digest에서 제외한다.
7. `mutedTags`와 일치하는 후보는 제외한다.
8. 개인화 점수는 원래 importance/confidence 값을 변경하지 않고 표시 순서에만 적용한다.
9. 프로필을 지정하지 않으면 기존 digest 결과가 바뀌지 않아야 한다.
10. 비밀값, Slack token, webhook URL은 profile이나 feedback에 저장하지 않는다.

## 완료 기준

- schema와 store 테스트가 profile/feedback 저장과 최신 action을 검증한다.
- reranking 테스트가 boost, hide, muted tag, stable tie-break를 검증한다.
- CLI 통합 테스트가 feedback 기록, profile 조회, preview를 검증한다.
- 기존 Slack, cron, ranking 전체 회귀 테스트가 통과한다.
- 검증 보고서, 완료 Markdown/HTML, PR 문서가 작성된다.
