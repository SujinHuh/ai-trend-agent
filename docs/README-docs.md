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

현재 작업은 `001_llm_wiki_local_store` PR 생성/리뷰 이후 `002_ai_official_source_ingestion`로 넘어간다.

작업 문서:

- [Task 001 Requirements](task/001_llm_wiki_local_store/requirements.md)
- [Task 001 Plan](task/001_llm_wiki_local_store/plan.md)
- [Task 001 Implementation Sequence](task/001_llm_wiki_local_store/implementation-sequence.md)
- [Task 001 Phase Status](task/001_llm_wiki_local_store/phase_status.md)
- [Task 001 Validation Report](task/001_llm_wiki_local_store/validation_report.md)

다음 작업 문서:

- [Task 002 Requirements](task/002_ai_official_source_ingestion/requirements.md)
- [Task 002 Plan](task/002_ai_official_source_ingestion/plan.md)
- [Task 002 Implementation Sequence](task/002_ai_official_source_ingestion/implementation-sequence.md)
- [Task 002 Phase Status](task/002_ai_official_source_ingestion/phase_status.md)
- [Task 002 Validation Report](task/002_ai_official_source_ingestion/validation_report.md)
- [Task 002 Step Plans](task/002_ai_official_source_ingestion/steps/README.md)

후속 작업 문서:

- [Task 003 Requirements](task/003_trenditem_ranking/requirements.md)
- [Task 003 Implementation Sequence](task/003_trenditem_ranking/implementation-sequence.md)
- [Task 003 Phase Status](task/003_trenditem_ranking/phase_status.md)
- [Task 007 Requirements](task/007_social_allow_list/requirements.md)
- [Task 007 Implementation Sequence](task/007_social_allow_list/implementation-sequence.md)
- [Task 007 Phase Status](task/007_social_allow_list/phase_status.md)

완료 확인 산출물:

- [Task 001 Completion Markdown](showcase/001_llm_wiki_local_store/completion.md)
- [Task 001 Completion HTML](showcase/001_llm_wiki_local_store/completion.html)
- [Task 002 Completion Markdown](showcase/002_ai_official_source_ingestion/completion.md)
- [Task 002 Completion HTML](showcase/002_ai_official_source_ingestion/completion.html)

외부 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/001_llm_wiki_local_store/completion.html
http://34.22.67.160/ai-trend-agent/showcase/002_ai_official_source_ingestion/completion.html
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
