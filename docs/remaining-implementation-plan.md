# Remaining Implementation Plan

## 목적

Karpathy LLM Wiki 참고 이후 아직 구현하지 않은 항목을 번호별로 정리한다. 이 문서는 Task 003, Task 007, later lint task의 작업 경계를 분리한다.

## Numbered Backlog

| No. | Item | Target task | Status | Owner role | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | LLM 요약 생성 `summary` | Task 003 | Pending | Ranking agent | 원문 title/excerpt/source evidence를 바탕으로 짧은 요약 생성 |
| 2 | `whyItMatters` | Task 003 | Pending | Ranking agent | 솔로 개발자 관점에서 왜 중요한지 설명 |
| 3 | `practicalImpact` | Task 003 | Pending | Ranking agent | 코드, 도구 선택, 비용, 학습, 제품 판단에 주는 영향 |
| 4 | `trendCategory` | Task 003 | Pending | Ranking agent | model, product, coding-agent, open-source, benchmark, safety, infra 등 |
| 5 | `actionLevel` | Task 003 | Pending | Ranking agent | `do_now`, `do_next`, `watch_later`, `needs_confirmation` |
| 6 | `confidence` | Task 003 | Pending | Ranking agent | 공식 출처, 교차 확인, 날짜/원문 품질 기반 |
| 7 | `importanceScore` | Task 003 | Pending | Ranking agent | daily digest 정렬 기준 |
| 8 | `sourceLineage` | Task 003 | Pending | Ranking agent | official source와 trusted/social signal 연결 |
| 9 | `confirmationStatus` | Task 003 | Pending | Ranking agent | `confirmed`, `needs_confirmation`, `disputed`, `discarded` |
| 10 | `contradictionNotes` | Task 003 | Pending | Ranking agent | 기존 item/digest와 충돌하는 주장 기록 |
| 11 | `stalenessPolicy` | Task 003 | Pending | Ranking agent | 재확인 날짜 또는 만료 기준 |
| 12 | daily digest candidate CLI | Task 003 | Pending | Ranking agent | `npm run digest:candidates -- --date=YYYY-MM-DD` |
| 13 | trusted individual registry | Task 007 | Done | Social signal agent | disabled-by-default social registry로 구현 |
| 14 | official org social registry | Task 007 | Done | Social signal agent | `official_social` credibility와 official domain matching 정책으로 구현 |
| 15 | community source registry | Task 007 | Done | Social signal agent | Reddit/HN/manual 후보를 disabled config로 구현 |
| 16 | social signal collector MVP | Task 007 | Done | Social signal agent | manual public JSONL import, HN fixture normalizer, Reddit RSS fixture normalizer 구현 |
| 17 | official-source cross-confirmation | Task 007 | Done | Ranking + Social signal agents | canonical outbound URL과 existing SourceEvidence 매칭 구현 |
| 18 | X live collector | 007B social live collectors | Deferred | Social signal agent | X API token scope, rate limit, billing/policy 확인 후 구현 |
| 19 | Threads live collector | 007B social live collectors | Deferred | Social signal agent | Meta API scope, app review, rate limit 확인 후 구현 |
| 20 | HN/Reddit live polling runner | 007B social live collectors | Deferred | Social signal agent | live polling 주기, cache, policyReviewedAt, rate limit 확인 후 구현 |
| 21 | wiki lint command | Later lint task | Pending | Validation agent | stale claim, contradiction, orphan tag, broken source 점검 |
| 22 | index/query entrypoint | Task 003 or web task | Pending | Validation/UI agent | DB/wiki 탐색 시작점 |
| 23 | markdown-style wiki page generator | Later wiki task | Pending | Wiki agent | Obsidian-style page 생성은 MVP 이후 |

## 진행 원칙

1. Task 003은 ranking/synthesis를 구현한다.
2. Task 007은 social/trusted source 수집 MVP를 구현한다.
3. Lint는 Task 003에서 최소 정책을 남기고, command 구현은 별도 later lint task로 분리한다.
4. X/Threads/Reddit/HN 신호는 공식 출처로 확인되기 전까지 `needs_confirmation`이다.
5. X/Threads live collector와 HN/Reddit live polling runner는 007 완료 조건이 아니라 007B 후속 확장이다.

## Task 003 최소 Done Criteria

1. `TrendItem` 또는 digest candidate가 `summary`, `whyItMatters`, `practicalImpact`를 가진다.
2. 각 candidate가 `actionLevel`, `confidence`, `importanceScore`를 가진다.
3. `needs_confirmation` item은 confirmed item과 분리된다.
4. source evidence와 candidate 사이의 lineage가 추적된다.
5. CLI로 특정 날짜의 digest candidate를 만들 수 있다.
6. 테스트가 score ordering, confidence, needs-confirmation 분리, duplicate handling을 커버한다.

## Task 007 최소 Done Criteria

1. trusted individual allow-list config가 있다.
2. official org social allow-list config가 있다.
3. 매체별 collector 방식이 명확하다.
4. X/Threads는 API token 없이는 실행하지 않는다.
5. Reddit/HN은 RSS/API 기반으로만 수집한다.
6. 모든 social item은 기본 `needs_confirmation`이다.
7. 공식 출처와 같은 URL 또는 같은 model/vendor/topic으로 연결될 때만 confidence boost가 가능하다.

## 007B Social Live Collectors Criteria

Dedicated task docs:

- [Task 007B Requirements](task/007B_social_live_collectors/requirements.md)
- [Task 007B Implementation Sequence](task/007B_social_live_collectors/implementation-sequence.md)

1. X API collector는 token scope, current rate limit, billing/app policy 확인 후에만 구현한다.
2. Threads collector는 Meta API scope와 app review 제약 확인 후에만 구현한다.
3. HN/Reddit live polling runner는 polling interval, cache, policyReviewedAt, deletion/dead filtering을 문서화한 뒤 구현한다.
4. 모든 live collector는 source별 disabled 기본값을 유지하고 explicit enable이 있어야 실행한다.
5. live collector도 social-only claim을 `needs_confirmation` 이상으로 승격하지 않는다.
