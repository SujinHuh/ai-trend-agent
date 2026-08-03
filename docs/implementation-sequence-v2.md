# Implementation Sequence v2

## 1. 목적

이 문서는 AI Trend Agent v2를 어떤 순서로 만들지 한눈에 보기 위한 실행 순서 문서다.

v2의 목표는 Rocket Brief 같은 뉴스 화면을 바로 만드는 것이 아니라, 먼저 신뢰 가능한 AI 트렌드 데이터를 수집, 저장, 요약, 발송할 수 있는 기반을 만드는 것이다.

웹 뉴스 화면은 좋은 참고 레퍼런스지만 MVP의 첫 구현 대상은 아니다.

Reference:

- Rocket Brief news 화면: https://rocket-brief.vercel.app/news
- Karpathy LLM Wiki 원문 참고: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- 프로젝트 적용 메모: [docs/llm-wiki-karpathy-reference.md](llm-wiki-karpathy-reference.md)
- 빠른 AI 개인/소셜 신호 watch-list: [docs/trusted-ai-signal-watchlist.md](trusted-ai-signal-watchlist.md)
- LLM Wiki 보강 gap 분석: [docs/llm-wiki-hotfix-gap-analysis.md](llm-wiki-hotfix-gap-analysis.md)
- 남은 구현 번호표: [docs/remaining-implementation-plan.md](remaining-implementation-plan.md)
- social signal 수집 방식: [docs/social-signal-collection-plan.md](social-signal-collection-plan.md)
- 반복 작업 하네스: [docs/v2-task-harness.md](v2-task-harness.md)

## 2. 전체 구현 순서

### 1. LLM Wiki 로컬 저장소

목표:

- SQLite 기반 로컬 지식 저장소를 만든다.
- 이후 수집, 요약, Slack, 웹 화면이 모두 이 저장소를 기준으로 동작하게 한다.

주요 산출물:

- `TrendItem`
- `Digest`
- `SourceEvidence`
- canonical URL 중복 제거
- stable ID
- 날짜별 digest 조회

상세 실행 순서:

- [docs/task/001_llm_wiki_local_store/implementation-sequence.md](task/001_llm_wiki_local_store/implementation-sequence.md)
- [docs/llm-wiki-karpathy-reference.md](llm-wiki-karpathy-reference.md)를 운영 원칙으로 참고한다.

### 2. AI 공식 출처 수집

목표:

- 공식 AI 출처에서 최신 항목을 가져와 LLM Wiki에 저장한다.

주요 산출물:

- Source Registry 설정
- RSS, Atom, HTML, GitHub Releases parser
- raw snapshot 저장
- KST 수집 윈도우 필터링
- source별 부분 실패 로그

초기 출처 후보:

- Anthropic News
- Mistral RSS
- Hugging Face Blog Feed
- OpenAI Python GitHub Releases

OpenAI News와 Google Blog Feed는 2026-08-01 live validation에서 안정적인 server-side ingestion source로 확인되지 않아 disabled backlog로 둔다.

상세 실행 순서:

- [docs/task/002_ai_official_source_ingestion/implementation-sequence.md](task/002_ai_official_source_ingestion/implementation-sequence.md)
- [docs/llm-wiki-hotfix-gap-analysis.md](llm-wiki-hotfix-gap-analysis.md)를 참고해 Task 002 hotfix와 Task 003 구현 범위를 분리한다.

진행 상태:

- [docs/task/002_ai_official_source_ingestion/phase_status.md](task/002_ai_official_source_ingestion/phase_status.md)

### 3. TrendItem 생성과 랭킹

목표:

- 수집된 항목을 daily digest 후보로 변환하고 중요도를 매긴다.

주요 산출물:

- 요약
- `whyItMatters`
- `practicalImpact`
- LLM 기반 중요도 판단
- LLM 기반 사용자 관심사 재정렬
- `trendCategory`
- `actionLevel`
- confidence score
- importance score
- source lineage
- confirmation status
- staleness policy
- urgent candidate 분리
- LLM token/cost usage log

구현 경계:

- 현재 Task 003 MVP는 LLM 없이 deterministic synthesis/ranking으로 동작한다.
- 최종 제품 목표에는 LLM 요약, 중요도 판단, 왜 중요한지 분석, 사용자 관심사 기반 재정렬이 포함된다.
- LLM 비용을 제한하기 위해 전체 크롤링 결과가 아니라 deterministic ranking 상위 5-10개만 기본 LLM 입력으로 사용한다.
- 크롤링, DB 저장, Slack 발송 자체는 LLM token을 사용하지 않는다.

상세 실행 순서:

- [docs/task/003_trenditem_ranking/implementation-sequence.md](task/003_trenditem_ranking/implementation-sequence.md)

완료 확인:

- [docs/showcase/003_trenditem_ranking/completion.md](showcase/003_trenditem_ranking/completion.md)
- [docs/showcase/003_trenditem_ranking/completion.html](showcase/003_trenditem_ranking/completion.html)

### 4. Slack 수동 발송

목표:

- 저장된 Digest를 Slack Incoming Webhook으로 수동 발송한다.

주요 산출물:

- Slack 메시지 템플릿
- Top AI Signals 3-5개
- urgent candidate 섹션
- 원문 링크
- LLM Wiki stable ID
- delivery attempt log

상세 실행 순서:

- [docs/task/004_slack_manual_delivery/implementation-sequence.md](task/004_slack_manual_delivery/implementation-sequence.md)

완료 확인:

- [docs/showcase/004_slack_manual_delivery/completion.md](showcase/004_slack_manual_delivery/completion.md)
- [docs/showcase/004_slack_manual_delivery/completion.html](showcase/004_slack_manual_delivery/completion.html)

### 5. Hermes `/cron` 연결

목표:

- Hermes `/cron`이 매일 `07:00 KST`에 digest 작업을 실행하게 한다.

주요 산출물:

- worker entrypoint
- cron 실행 endpoint
- idempotency key
- 중복 발송 방지
- 단계별 실패 로그

상세 실행 순서:

- [docs/task/005_hermes_cron/implementation-sequence.md](task/005_hermes_cron/implementation-sequence.md)

완료 확인:

- [docs/showcase/005_hermes_cron/completion.md](showcase/005_hermes_cron/completion.md)
- [docs/showcase/005_hermes_cron/completion.html](showcase/005_hermes_cron/completion.html)

### 6. GCP 배포

목표:

- 로컬에서 검증된 흐름을 운영 환경으로 옮긴다.

주요 산출물:

- Cloud Run worker
- Secret Manager 연동
- Cloud Logging
- Cloud Storage raw snapshot 저장
- Cloud SQL PostgreSQL 또는 Firestore 전환 판단

상세 실행 순서:

- [docs/task/006_gcp_deployment/implementation-sequence.md](task/006_gcp_deployment/implementation-sequence.md)

완료 확인:

- [docs/showcase/006_gcp_deployment/completion.md](showcase/006_gcp_deployment/completion.md)
- [docs/showcase/006_gcp_deployment/completion.html](showcase/006_gcp_deployment/completion.html)

### 7. 소셜 allow-list 확장

목표:

- 빠른 AI 신호 채널을 제한적으로 추가한다.

주요 산출물:

- X/Twitter allow-list
- Threads allow-list
- Reddit, Hacker News 키워드 수집
- 낮은 신뢰도 정책
- 공식 출처와 교차 확인 규칙

MVP 완료 기준:

- social registry와 social item storage를 만든다.
- manual public JSONL import를 지원한다.
- HN/Reddit은 fixture-safe normalizer까지 구현한다.
- X/Threads live collector와 HN/Reddit live polling runner는 구현하지 않고 `007B_social_live_collectors` 후속 확장으로 둔다.
- 이유: 토큰 범위, rate limit, platform policy, app review 확인 전에는 운영 collector를 켜지 않는다.

참고:

- [docs/trusted-ai-signal-watchlist.md](trusted-ai-signal-watchlist.md)
- [docs/task/007_social_allow_list/implementation-sequence.md](task/007_social_allow_list/implementation-sequence.md)

### 7B. 소셜 live collector 선택 확장

목표:

- Slack daily digest에 들어갈 빠른 social signal을 실제 live polling으로 보강한다.

진행 조건:

- 008 도메인 확장보다 daily AI trend 품질 개선이 더 급하면 007B를 먼저 진행한다.
- HN/Reddit live polling은 secrets 없이 시작할 수 있다.
- X/Threads는 토큰 범위, rate limit, billing/app policy, app review 확인 전까지 Deferred로 유지한다.

주요 산출물:

- HN live polling runner
- Reddit RSS live polling runner
- `social:poll --dry-run`
- rate-limit/cache guard
- deleted/dead/private/unverifiable content filter
- official evidence matching handoff

참고:

- [docs/task/007B_social_live_collectors/requirements.md](task/007B_social_live_collectors/requirements.md)
- [docs/task/007B_social_live_collectors/implementation-sequence.md](task/007B_social_live_collectors/implementation-sequence.md)

### 7C. LLM digest intelligence 선택 확장

목표:

- Slack daily digest가 단순 링크 목록이 아니라, 사용자가 바로 읽을 수 있는 LLM 요약과 판단을 포함하게 한다.

진행 조건:

- 007B 이후 HN/Reddit live signal을 포함한 후보를 LLM이 판단하게 만들고 싶을 때 진행한다.
- 또는 008 도메인 확장보다 daily AI trend 요약 품질 개선이 더 급하면 007C를 먼저 진행한다.
- crawler-only mode는 계속 유지한다. LLM이 꺼져 있어도 수집, 저장, ranking, Slack 발송은 동작해야 한다.
- LLM 비용을 제한하기 위해 deterministic ranking 상위 5-10개 후보만 기본 입력으로 사용한다.

주요 산출물:

- LLM provider abstraction
- prompt builder with secret redaction
- structured response parser
- `summary`, `whyItMatters`, `practicalImpact`
- importance, urgency, action level, user-interest relevance judgment
- token/cost usage log
- deterministic fallback
- Slack digest enrichment handoff

보안/비용 경계:

- Slack webhook URL, `CRON_SECRET`, OAuth token, API key, auth code는 prompt에 넣지 않는다.
- LLM output은 social-only claim을 `confirmed`로 승격할 수 없다.
- 매 실행마다 input/output token과 estimated cost를 기록한다.

참고:

- [docs/llm-token-cost-plan.md](llm-token-cost-plan.md)
- [docs/task/007C_llm_digest_intelligence/requirements.md](task/007C_llm_digest_intelligence/requirements.md)
- [docs/task/007C_llm_digest_intelligence/implementation-sequence.md](task/007C_llm_digest_intelligence/implementation-sequence.md)

### 8. Backend, Frontend, DevOps 도메인 확장

목표:

- AI 외 기술 도메인 digest를 추가할 수 있게 한다.

주요 산출물:

- domain별 source registry
- domain별 tag
- domain별 ranking weight
- Slack section 분리
- `enabledDomains`

### 9. Slack 피드백과 개인화

목표:

- 사용자가 Slack에서 준 피드백을 다음 랭킹에 반영한다.

주요 산출물:

- Slack Bot API 전환 검토
- 관심 있음
- 나중에 보기
- 숨기기
- muted tags
- `UserInterestProfile`

### 10. 웹 뉴스 화면

목표:

- LLM Wiki에 쌓인 TrendItem과 Digest를 웹에서 탐색한다.

주요 산출물:

- 날짜별 news view
- Top Signals 목록
- 항목별 원문 링크
- source, tag, domain, confidence, importance 표시
- 검색과 필터를 붙일 수 있는 URL 구조

참고:

- Rocket Brief news 화면은 이 단계에서 UI/UX 레퍼런스로 다시 본다.

## 3. 권장 서브 에이전트 분리

실제 구현 시에는 아래처럼 역할을 나누는 것을 권장한다.

1. Docs agent: 요구사항, 계획, 검증 리포트, 작업 로그 정리
2. Storage agent: SQLite schema, migration, repository 구현
3. Validation agent: URL canonicalization, stable ID, 중복 제거 테스트
4. Ingestion agent: Source Registry, fetcher, parser, raw snapshot
5. Ranking agent: 요약, confidence, importance, urgent candidate
6. Delivery agent: Slack template, 발송 로그, idempotency
7. Ops agent: Hermes cron, GCP, secret, logging
8. UI agent: MVP 이후 웹 뉴스 화면

초기에는 1-3번 agent 역할만 필요하다. 4번 이후는 LLM Wiki 로컬 저장소가 검증된 뒤 시작한다.

## 4. 진행 상태와 로그 원칙

각 task는 작업 단계별 진행 상태를 문서로 남긴다.

Task 시작 전, 구현 후, showcase 작성 후, PR/merge 후에는 [v2 Task Harness](v2-task-harness.md)의 체크리스트를 사용한다.

권장 파일:

```text
docs/task/<task_id>/phase_status.md
```

원칙:

- 작업 완료 보고만으로 완료 처리하지 않는다.
- 파일 변경, 명령 결과, 테스트 결과를 검수한 뒤 완료 처리한다.
- 검수 통과 전 상태는 `Review` 또는 `Needs Fix`로 둔다.
- 의미 있는 진행, 검수, 수정은 `docs/logs/YYYY-MM-DD.md`에 기록한다.
- 이 프로젝트는 구현보다 기록이 앞서야 하는 것이 아니라, 구현 흐름을 잃지 않기 위해 필요한 수준으로 기록한다.

## 5. 완료 산출물 확인 원칙

각 전체 구현 단계가 사용자가 확인할 수 있는 상태가 되면, 사람이 읽을 수 있는 완료 산출물을 남긴다.

완료 산출물은 아래 두 파일을 기본으로 한다.

```text
docs/showcase/<NNN_task_name>/
  completion.md
  completion.html
```

세부 작성 순서, 로컬 서버 URL, GCP nginx 공개 URL 기록 방식은 [Showcase Workflow](showcase-workflow.md)를 따른다.

Task 001 완료 확인 산출물:

- [docs/showcase/001_llm_wiki_local_store/completion.md](showcase/001_llm_wiki_local_store/completion.md)
- [docs/showcase/001_llm_wiki_local_store/completion.html](showcase/001_llm_wiki_local_store/completion.html)

Task 001 확인 URL:

```text
http://127.0.0.1:4173/showcase/001_llm_wiki_local_store/completion.html
```

Task 001 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/001_llm_wiki_local_store/completion.html
```

Task 001 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/001_llm_wiki_local_store/completion.html
```

Task 002 완료 확인 산출물:

- [docs/showcase/002_ai_official_source_ingestion/completion.md](showcase/002_ai_official_source_ingestion/completion.md)
- [docs/showcase/002_ai_official_source_ingestion/completion.html](showcase/002_ai_official_source_ingestion/completion.html)

Task 002 확인 URL:

```text
http://127.0.0.1:4173/showcase/002_ai_official_source_ingestion/completion.html
```

Task 002 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/002_ai_official_source_ingestion/completion.html
```

Task 002 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/002_ai_official_source_ingestion/completion.html
```

Task 003 완료 확인 산출물:

- [docs/showcase/003_trenditem_ranking/completion.md](showcase/003_trenditem_ranking/completion.md)
- [docs/showcase/003_trenditem_ranking/completion.html](showcase/003_trenditem_ranking/completion.html)

Task 003 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/003_trenditem_ranking/completion.html
```

Task 004 완료 확인 산출물:

- [docs/showcase/004_slack_manual_delivery/completion.md](showcase/004_slack_manual_delivery/completion.md)
- [docs/showcase/004_slack_manual_delivery/completion.html](showcase/004_slack_manual_delivery/completion.html)

Task 004 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/004_slack_manual_delivery/completion.html
```

Task 005 완료 확인 산출물:

- [docs/showcase/005_hermes_cron/completion.md](showcase/005_hermes_cron/completion.md)
- [docs/showcase/005_hermes_cron/completion.html](showcase/005_hermes_cron/completion.html)

Task 005 확인 URL:

```text
http://127.0.0.1:4173/showcase/005_hermes_cron/completion.html
```

Task 005 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/005_hermes_cron/completion.html
```

Task 005 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/005_hermes_cron/completion.html
```

Task 006 완료 확인 산출물:

- [docs/showcase/006_gcp_deployment/completion.md](showcase/006_gcp_deployment/completion.md)
- [docs/showcase/006_gcp_deployment/completion.html](showcase/006_gcp_deployment/completion.html)

Task 006 확인 URL:

```text
http://127.0.0.1:4173/showcase/006_gcp_deployment/completion.html
```

Task 006 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/006_gcp_deployment/completion.html
```

Task 006 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/006_gcp_deployment/completion.html
```

Task 007 완료 확인 산출물:

- [docs/showcase/007_social_allow_list/completion.md](showcase/007_social_allow_list/completion.md)
- [docs/showcase/007_social_allow_list/completion.html](showcase/007_social_allow_list/completion.html)

Task 007 확인 URL:

```text
http://127.0.0.1:4173/showcase/007_social_allow_list/completion.html
```

Task 007 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/007_social_allow_list/completion.html
```

Task 007 GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007_social_allow_list/completion.html
```

Task 007B 완료 확인 산출물:

- [docs/showcase/007B_social_live_collectors/completion.md](showcase/007B_social_live_collectors/completion.md)
- [docs/showcase/007B_social_live_collectors/completion.html](showcase/007B_social_live_collectors/completion.html)

Task 007B 로컬 확인 URL:

```text
http://127.0.0.1:4173/showcase/007B_social_live_collectors/completion.html
```

Task 007B 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/007B_social_live_collectors/completion.html
```

Task 007B GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007B_social_live_collectors/completion.html
```

Task 007C 완료 확인 산출물:

- [docs/showcase/007C_llm_digest_intelligence/completion.md](showcase/007C_llm_digest_intelligence/completion.md)
- [docs/showcase/007C_llm_digest_intelligence/completion.html](showcase/007C_llm_digest_intelligence/completion.html)

Task 007C 로컬 확인 URL:

```text
http://127.0.0.1:4173/showcase/007C_llm_digest_intelligence/completion.html
```

Task 007C 직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/007C_llm_digest_intelligence/completion.html
```

Task 007C GCP nginx 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007C_llm_digest_intelligence/completion.html
```
