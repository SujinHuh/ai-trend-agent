# Task 009 계획 - Slack 피드백과 개인화

## 구현 전략

1. 기존 domain type에 profile, feedback action/event 타입을 추가한다.
2. append-only feedback event와 사용자 profile table을 SQLite schema에 추가한다.
3. store에 profile upsert/get, feedback save/list/latest 조회를 추가한다.
4. 후보의 category와 source/domain lineage에서 deterministic interest tag를 만든다.
5. 최신 feedback과 profile을 적용해 후보를 필터링하고 재정렬한다.
6. Slack build path는 `userId`가 명시된 경우에만 개인화를 적용한다.
7. CLI로 `feedback:record`, `profile:get`, `profile:update`, `personalization:preview`를 제공한다.
8. focused/full validation과 독립 검수를 거쳐 완료 보고서를 만든다.

## 설계 원칙

- 기존 deterministic importance score는 수정하지 않는다.
- 개인화는 별도의 정렬 점수로만 사용한다.
- 사용자 ID가 없으면 Task 008까지의 결과와 payload가 동일해야 한다.
- feedback event는 감사 가능하도록 append-only로 저장한다.
- 동일 항목의 현재 의도는 가장 최근 event로 계산한다.
- Slack Bot API 도입 전에도 domain/store contract를 검증할 수 있게 한다.

## 검증

```text
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

