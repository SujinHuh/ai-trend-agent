# Remaining Implementation Plan

## 목적

Karpathy LLM Wiki 참고 이후 아직 구현하지 않은 항목을 번호별로 정리한다. 이 문서는 Task 003, Task 007, later lint task의 작업 경계를 분리한다.

## Numbered Backlog

| No. | Item | Target task | Status | Owner role | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | LLM 요약 생성 `summary` | Task 003 + 007C | Done | Ranking agent | Task 003 deterministic summary, Task 007C opt-in LLM enrichment 구현 |
| 2 | `whyItMatters` | Task 003 + 007C | Done | Ranking agent | Task 003 deterministic field, Task 007C opt-in LLM enrichment 구현 |
| 3 | `practicalImpact` | Task 003 + 007C | Done | Ranking agent | Task 003 deterministic field, Task 007C opt-in LLM enrichment 구현 |
| 4 | `trendCategory` | Task 003 | Done | Ranking agent | model, product, coding-agent, open-source, benchmark, safety, infra 등 |
| 5 | `actionLevel` | Task 003 + 007C | Done | Ranking agent | deterministic trust gate 유지, 007C LLM action judgment는 trust gate 통과 |
| 6 | `confidence` | Task 003 | Done | Ranking agent | 공식 출처, 교차 확인, 날짜/원문 품질 기반 |
| 7 | `importanceScore` | Task 003 + 007C | Done | Ranking agent | deterministic ranking + 007C opt-in LLM enrichment score clamp |
| 8 | `sourceLineage` | Task 003 + 007B | Done | Ranking agent | official SourceEvidence lineage와 social signal matching handoff 구현 |
| 9 | `confirmationStatus` | Task 003 + 007C | Done | Ranking agent | deterministic confirmation policy 구현; 007C LLM output은 승격 불가 |
| 10 | `contradictionNotes` | Task 003 | Done | Ranking agent | field와 persistence 구현 |
| 11 | `stalenessPolicy` | Task 003 | Done | Ranking agent | 재확인 날짜 기준 구현 |
| 12 | daily digest candidate CLI | Task 003 | Done | Ranking agent | `npm run digest:candidates -- --date=YYYY-MM-DD` |
| 13 | trusted individual registry | Task 007 | Done | Social signal agent | disabled-by-default social registry로 구현 |
| 14 | official org social registry | Task 007 | Done | Social signal agent | `official_social` credibility와 official domain matching 정책으로 구현 |
| 15 | community source registry | Task 007 | Done | Social signal agent | Reddit/HN/manual 후보를 disabled config로 구현 |
| 16 | social signal collector MVP | Task 007 | Done | Social signal agent | manual public JSONL import, HN fixture normalizer, Reddit RSS fixture normalizer 구현 |
| 17 | official-source cross-confirmation | Task 007 | Done | Ranking + Social signal agents | canonical outbound URL과 existing SourceEvidence 매칭 구현 |
| 18 | X live collector | 007B social live collectors | Deferred | Social signal agent | X API token scope, rate limit, billing/policy 확인 후 구현 |
| 19 | Threads live collector | 007B social live collectors | Deferred | Social signal agent | Meta API scope, app review, rate limit 확인 후 구현 |
| 20 | HN/Reddit live polling runner | 007B social live collectors | Done | Social signal agent | opt-in HN Firebase API와 Reddit RSS live polling 구현 |
| 21 | wiki lint command | Later lint task | Pending | Validation agent | stale claim, contradiction, orphan tag, broken source 점검 |
| 22 | index/query entrypoint | Task 003 or web task | Pending | Validation/UI agent | DB/wiki 탐색 시작점 |
| 23 | markdown-style wiki page generator | Later wiki task | Pending | Wiki agent | Obsidian-style page 생성은 MVP 이후 |
| 24 | LLM summary provider integration | 007C LLM digest intelligence | Done | Hermes/Ranking agent | Top 5-10 후보 LLM enrichment, provider abstraction, prompt redaction, Slack opt-in handoff 구현 |
| 25 | LLM token/cost logging | 007C LLM digest intelligence | Done | Ops/Ranking agent | 별도 `llm_usage_logs` 테이블에 input/output tokens, estimated cost 기록 |
| 26 | user interest reranking | Task 009 | Pending | Personalization agent | 관심 태그, Slack feedback, muted tags 기반 재정렬 |
| 27 | Backend/Frontend/DevOps domain expansion | Task 008 | Review | Domain expansion agent | source domain schema, `enabledDomains`, ranking weight, Slack domain section, CLI/cron handoff 구현 |

## 진행 원칙

1. Task 003은 ranking/synthesis를 구현한다.
2. Task 007은 social/trusted source 수집 MVP를 구현한다.
3. Lint는 Task 003에서 최소 정책을 남기고, command 구현은 별도 later lint task로 분리한다.
4. X/Threads/Reddit/HN 신호는 공식 출처로 확인되기 전까지 `needs_confirmation`이다.
5. X/Threads live collector는 policy/token review 전까지 Deferred이고, HN/Reddit live polling runner는 007B에서 구현됐다.
6. 크롤링, 저장, Slack 발송만으로는 LLM token 비용이 발생하지 않는다.
7. 사용자가 읽을 요약, 중요도 판단, 왜 중요한지 분석은 007C에서 구현됐고, 개인 관심사 기반 재정렬은 Task 009 범위다.
8. LLM 적용은 전체 수집 결과가 아니라 deterministic ranking 상위 5-10개 후보부터 시작한다.
9. Backend, Frontend, DevOps 도메인 확장은 Task 008에서 구현됐고, 기본 enabled domain은 계속 `ai`다.

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
- [Task 007B Plan](task/007B_social_live_collectors/plan.md)
- [Task 007B Implementation Sequence](task/007B_social_live_collectors/implementation-sequence.md)
- [Task 007B Phase Status](task/007B_social_live_collectors/phase_status.md)

1. X API collector는 token scope, current rate limit, billing/app policy 확인 후에만 구현한다.
2. Threads collector는 Meta API scope와 app review 제약 확인 후에만 구현한다.
3. HN/Reddit live polling runner는 polling interval, cache, policyReviewedAt, deletion/dead filtering을 문서화한 뒤 구현한다.
4. 모든 live collector는 source별 disabled 기본값을 유지하고 explicit enable이 있어야 실행한다.
5. live collector도 social-only claim을 `needs_confirmation` 이상으로 승격하지 않는다.

## 007C LLM Digest Intelligence Criteria

Dedicated task docs:

- [Task 007C Requirements](task/007C_llm_digest_intelligence/requirements.md)
- [Task 007C Plan](task/007C_llm_digest_intelligence/plan.md)
- [Task 007C Implementation Sequence](task/007C_llm_digest_intelligence/implementation-sequence.md)
- [Task 007C Phase Status](task/007C_llm_digest_intelligence/phase_status.md)

1. crawler-only mode는 LLM token 없이 계속 동작해야 한다.
2. LLM mode는 deterministic ranking 상위 5-10개 후보만 기본 입력으로 사용한다.
3. `summary`, `whyItMatters`, `practicalImpact`, importance/action judgment를 생성한다.
4. input/output token과 estimated cost를 run별로 기록한다.
5. prompt에는 Slack webhook URL, `CRON_SECRET`, OAuth token, API key, auth code가 들어가지 않는다.
6. LLM output도 social-only claim을 `confirmed`로 승격하지 않는다.
