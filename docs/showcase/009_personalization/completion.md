# Slack 피드백과 개인화 완료 보고서

## 현재 상태

Task 009 구현, 전체 검증, 독립 검수를 완료했다.

```text
GCP: http://34.22.67.160/ai-trend-agent/showcase/009_personalization/completion.html
```

## 구현 내용

- 사용자별 `UserInterestProfile` 저장
- `interested`, `save_later`, `hide` feedback event 저장
- unique `eventKey` 기반 Slack/CLI retry 멱등성
- high/normal/muted tag와 blocked keyword 정책
- profile enabled domain과 runtime enabled domain 교집합
- 전체 후보 pool에서 deterministic personalized reranking
- profile 발송 시각 기준 feedback cutoff
- Slack build/send와 Hermes cron의 opt-in personalization
- profile update/get, feedback record, personalization preview CLI

## 안전 경계

- base importance, confidence, confirmation, action level은 변경하지 않는다.
- profile을 지정하지 않으면 기존 digest 순서와 payload를 유지한다.
- token, webhook URL, Signing Secret은 profile/feedback에 저장하지 않는다.
- Slack interactive endpoint는 raw-body HMAC과 replay 방어가 필요한 후속 보안 범위다.
- Task 009 태그는 `trendCategory`, source registry tags, domain으로 제한한다.

## 독립 검수

- candidate SQL limit 이전 개인화가 불가능한 문제를 전체 pool 후 최종 limit으로 수정
- timezone offset feedback을 UTC ISO로 정규화
- 순차/동시 retry의 event-key idempotency 보강
- report date가 아니라 profile KST 발송 시각을 feedback cutoff로 적용
- schema CHECK, UNIQUE, FK drift assertion과 v7 -> v8 upgrade 검증
- 비활성 domain history가 AI로 fallback되는 metadata 경계 수정
- 최종 재검수에서 blocker 없음

## 검증 결과

```text
npm run typecheck: passed
npm run build: passed
npm test -- --run: 23 files / 166 tests passed
git diff --check: passed
```

## 제외한 것

- Slack OAuth와 Bot token 설치
- Slack interactive request endpoint
- DM/thread/multi-workspace delivery
- 실제 사용자 데이터와 실제 Slack action
- item별 tag persistence

## 다음 단계

다음 v2 구현 단계는 `010_web_news_view`다. Slack interactive feedback endpoint는 별도 보안 task로 진행할 수 있다.

