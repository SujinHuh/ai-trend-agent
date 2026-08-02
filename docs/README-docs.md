# Docs Map

이 문서는 현재 어떤 docs를 우선 읽어야 하는지 정리하는 입구 문서다.

## 현재 기준 문서

v2 작업을 진행할 때는 아래 문서를 우선 기준으로 본다.

1. [Implementation Sequence v2](implementation-sequence-v2.md)
2. [Requirements v2 - LLM Wiki and Hermes](requirements-v2-llm-wiki-hermes.md)
3. [Development Plan v2 - LLM Wiki, Hermes, Slack](development-plan-v2-llm-wiki-hermes.md)
4. [Acceptance Criteria](acceptance-criteria.md)
5. [v2 Task Harness](v2-task-harness.md)
6. [LLM Wiki Karpathy Reference](llm-wiki-karpathy-reference.md)
7. [Trusted AI Signal Watchlist](trusted-ai-signal-watchlist.md)
8. [LLM Wiki Hotfix Gap Analysis](llm-wiki-hotfix-gap-analysis.md)
9. [Remaining Implementation Plan](remaining-implementation-plan.md)
10. [Social Signal Collection Plan](social-signal-collection-plan.md)

## 현재 작업

현재 작업은 `007_social_allow_list` MVP 구현과 검증까지 완료했다.

다음 v2 구현 후보는 두 갈래다.

1. `007B_social_live_collectors`: Slack 일일 digest 품질을 먼저 올리고 싶을 때 진행한다. HN/Reddit live polling을 우선 구현하고 X/Threads는 계속 Deferred로 둔다.
2. `008_domain_expansion`: Backend, Frontend, DevOps 도메인 확장을 먼저 하고 싶을 때 진행한다.

007에서 일부러 제외한 X/Threads live collector와 HN/Reddit live polling runner는 `007B_social_live_collectors` 후속 확장 backlog로 둔다. 단, X/Threads는 토큰 범위, rate limit, platform policy, app review 확인 전까지 구현하지 않는다.

작업 문서:

- [Task 001 Requirements](task/001_llm_wiki_local_store/requirements.md)
- [Task 001 Plan](task/001_llm_wiki_local_store/plan.md)
- [Task 001 Implementation Sequence](task/001_llm_wiki_local_store/implementation-sequence.md)
- [Task 001 Phase Status](task/001_llm_wiki_local_store/phase_status.md)
- [Task 001 Validation Report](task/001_llm_wiki_local_store/validation_report.md)

다음 작업 문서:

- [Task 003 Requirements](task/003_trenditem_ranking/requirements.md)
- [Task 003 Plan](task/003_trenditem_ranking/plan.md)
- [Task 003 Implementation Sequence](task/003_trenditem_ranking/implementation-sequence.md)
- [Task 003 Phase Status](task/003_trenditem_ranking/phase_status.md)
- [Task 003 Validation Report](task/003_trenditem_ranking/validation_report.md)
- [Task 003 Step Plans](task/003_trenditem_ranking/steps/README.md)
- [Task 004 Requirements](task/004_slack_manual_delivery/requirements.md)
- [Task 004 Plan](task/004_slack_manual_delivery/plan.md)
- [Task 004 Implementation Sequence](task/004_slack_manual_delivery/implementation-sequence.md)
- [Task 004 Phase Status](task/004_slack_manual_delivery/phase_status.md)
- [Task 004 Validation Report](task/004_slack_manual_delivery/validation_report.md)
- [Task 004 Step Plans](task/004_slack_manual_delivery/steps/README.md)
- [Task 005 Requirements](task/005_hermes_cron/requirements.md)
- [Task 005 Plan](task/005_hermes_cron/plan.md)
- [Task 005 Implementation Sequence](task/005_hermes_cron/implementation-sequence.md)
- [Task 005 Phase Status](task/005_hermes_cron/phase_status.md)
- [Task 005 Validation Report](task/005_hermes_cron/validation_report.md)
- [Task 005 Step Plans](task/005_hermes_cron/steps/README.md)
- [Task 006 Requirements](task/006_gcp_deployment/requirements.md)
- [Task 006 Plan](task/006_gcp_deployment/plan.md)
- [Task 006 Implementation Sequence](task/006_gcp_deployment/implementation-sequence.md)
- [Task 006 Phase Status](task/006_gcp_deployment/phase_status.md)
- [Task 006 Validation Report](task/006_gcp_deployment/validation_report.md)
- [Task 006 Step Plans](task/006_gcp_deployment/steps/README.md)

후속 작업 문서:

- [Task 007 Requirements](task/007_social_allow_list/requirements.md)
- [Task 007 Plan](task/007_social_allow_list/plan.md)
- [Task 007 Implementation Sequence](task/007_social_allow_list/implementation-sequence.md)
- [Task 007 Phase Status](task/007_social_allow_list/phase_status.md)
- [Task 007 Validation Report](task/007_social_allow_list/validation_report.md)
- [Task 007B Requirements](task/007B_social_live_collectors/requirements.md)
- [Task 007B Plan](task/007B_social_live_collectors/plan.md)
- [Task 007B Implementation Sequence](task/007B_social_live_collectors/implementation-sequence.md)
- [Task 007B Phase Status](task/007B_social_live_collectors/phase_status.md)

완료 확인 산출물:

- [Task 001 Completion Markdown](showcase/001_llm_wiki_local_store/completion.md)
- [Task 001 Completion HTML](showcase/001_llm_wiki_local_store/completion.html)
- [Task 002 Completion Markdown](showcase/002_ai_official_source_ingestion/completion.md)
- [Task 002 Completion HTML](showcase/002_ai_official_source_ingestion/completion.html)
- [Task 003 Completion Markdown](showcase/003_trenditem_ranking/completion.md)
- [Task 003 Completion HTML](showcase/003_trenditem_ranking/completion.html)
- [Task 004 Completion Markdown](showcase/004_slack_manual_delivery/completion.md)
- [Task 004 Completion HTML](showcase/004_slack_manual_delivery/completion.html)
- [Task 005 Completion Markdown](showcase/005_hermes_cron/completion.md)
- [Task 005 Completion HTML](showcase/005_hermes_cron/completion.html)
- [Task 006 Completion Markdown](showcase/006_gcp_deployment/completion.md)
- [Task 006 Completion HTML](showcase/006_gcp_deployment/completion.html)
- [Task 007 Completion Markdown](showcase/007_social_allow_list/completion.md)
- [Task 007 Completion HTML](showcase/007_social_allow_list/completion.html)

외부 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/001_llm_wiki_local_store/completion.html
http://34.22.67.160/ai-trend-agent/showcase/002_ai_official_source_ingestion/completion.html
http://34.22.67.160/ai-trend-agent/showcase/003_trenditem_ranking/completion.html
http://34.22.67.160/ai-trend-agent/showcase/004_slack_manual_delivery/completion.html
http://34.22.67.160/ai-trend-agent/showcase/005_hermes_cron/completion.html
http://34.22.67.160/ai-trend-agent/showcase/006_gcp_deployment/completion.html
http://34.22.67.160/ai-trend-agent/showcase/007_social_allow_list/completion.html
```

## 작업 흐름 문서

- [Documentation Workflow](doc-workflow.md)
- [Harness Workflow](harness-workflow.md)
- [v2 Task Harness](v2-task-harness.md)
- [Showcase Workflow](showcase-workflow.md)
- [PR Workflow](pr-workflow.md)
- [Token Workflow](token-workflow.md)

## 보조 참고 문서

- [Source Registry](source-registry.md)
- [v2 Task Harness](v2-task-harness.md)
- [LLM Wiki Karpathy Reference](llm-wiki-karpathy-reference.md)
- [Trusted AI Signal Watchlist](trusted-ai-signal-watchlist.md)
- [LLM Wiki Hotfix Gap Analysis](llm-wiki-hotfix-gap-analysis.md)
- [Remaining Implementation Plan](remaining-implementation-plan.md)
- [Social Signal Collection Plan](social-signal-collection-plan.md)
- [Data Schema](data-schema.md)
- [Operations](operations.md)
- [Architecture Reference](architecture.md)

## 보관 문서

아래 문서는 현재 구현 기준이 아니라 과거 v1 또는 초안 참고 문서다.

`docs/implementation-sequence-v1.md`는 현재 없다. v1 구현 흐름은 아래 archive 문서들을 참고하되, 현재 실행 기준은 v2 문서와 task별 implementation sequence다.

- [Legacy Requirements](archive/v1/requirements.md)
- [Legacy Development Plan](archive/v1/development-plan.md)
- [Legacy Review Notes](archive/v1/review-notes.md)
- [Legacy Interview Requirements](archive/v1/interview-requirements.md)
- [Legacy Task 001](archive/v1/001_local_collect_markdown_report/requirements.md)
- [Superseded Slack and LLM Wiki Draft](archive/drafts/draft-slack-llm-wiki-requirements.md)
