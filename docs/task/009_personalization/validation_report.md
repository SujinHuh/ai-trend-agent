# Task 009 검증 보고서 - Slack 피드백과 개인화

## 현재 상태

Task 009 구현, 리뷰 지적 반영, 최종 전체 검증을 완료했다.

## 구현 내용

- `UserInterestProfile`, `PersonalizationFeedback` domain type
- SQLite schema version 8과 additive profile/feedback table
- profile JSON normalization과 partial update
- append-only feedback event와 unique `eventKey` retry idempotency
- feedback UTC ISO normalization과 profile delivery-time cutoff
- 전체 후보 pool 기반 deterministic personalization
- `interested`, `save_later`, `hide`, muted tag, blocked keyword 정책
- runtime enabled domain과 profile domain의 교집합
- Slack build/send와 cron의 선택적 `userProfileId`
- profile/feedback/personalization preview CLI

## 독립 검수와 반영

사전 검수:

- High: SQL `LIMIT` 이후 reranking 위험을 반영해 전체 candidate pool 조회 후 최종 limit을 적용했다.
- High: profile과 item feedback을 분리하고 unique event key가 있는 append-only table로 구현했다.
- High: Slack interactive action 수신은 서명 검증 endpoint 없이는 안전하지 않아 MVP에서 제외했다.
- High: item별 tag가 영속화되지 않는 한계를 문서화하고 `trendCategory`, source tags, domain만 사용한다.

전체 코드 검수:

- High: timezone 표현이 다른 feedback의 TEXT ordering 위험을 UTC ISO normalization으로 수정했다.
- High: `--occurred-at` 없는 retry와 동시 `ON CONFLICT` 경로가 같은 event를 반환하도록 수정했다.
- Medium: report date 종료가 아니라 profile `preferredDeliveryTime` KST를 cutoff로 사용한다.
- Medium: schema assertion에 timezone/action CHECK, event key UNIQUE, FK cascade를 추가했다.
- Medium: full runtime metadata와 profile-filtered source를 분리해 비활성 domain history 오분류를 막았다.
- Medium: 빈 `PERSONALIZATION_USER_ID`를 opt-in으로 해석하지 않도록 수정했다.
- Medium: v7에서 v8로의 additive upgrade와 기존 TrendItem 보존 테스트를 추가했다.
- Low: feedback event 발생 시각과 DB insert 시각을 분리하고 JSON drift 메시지를 일반화했다.

리뷰 환경의 sandbox에서는 CLI subprocess와 local socket이 `EPERM`으로 실패했지만, 권한 제약 밖 clean full suite에서 CLI 20개와 cron HTTP 9개를 포함한 전체 테스트가 통과했다.

## 검증 명령

```text
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

최종 전체 검증:

```text
23 files passed
166 tests passed
```

리뷰 지적 반영 중간 검증:

```text
focused 4 files / 42 tests passed
typecheck passed
git diff --check passed
```

최종 독립 재검수에서 새 blocker가 없음을 확인했다.

## 공개 확인

GCP 공개 URL에서 HTTP 200과 Task 009 완료 HTML 본문을 확인했다.

```text
http://34.22.67.160/ai-trend-agent/showcase/009_personalization/completion.html
body includes: Task 009 Personalization Completion
body includes: 166 passed
```

## 제외한 것

- 실제 Slack OAuth/Bot 설치
- Slack interaction request 서명 검증 HTTP endpoint
- 사용자별 DM, thread, multi-workspace delivery
- 실제 사용자 데이터와 외부 Slack action
- item별 tag persistence

Slack interactive endpoint를 추가할 때는 raw body HMAC, timestamp replay 제한, constant-time 비교, team/user allow-list, retry dedupe를 별도 보안 task로 구현해야 한다.
