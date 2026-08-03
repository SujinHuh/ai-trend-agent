# 도메인 확장 완료 보고서

## 요약

Task 008은 AI Trend Agent v2의 source registry와 digest pipeline을 AI 외 기술 도메인으로 확장할 수 있게 만들었다.

기본 동작은 계속 `ai` 도메인만 활성화한다. Backend, Frontend, DevOps source는 `--domains=ai,backend` 또는 `ENABLED_DOMAINS=ai,backend`처럼 명시적으로 켤 때만 ingest, ranking, Slack digest에 들어간다.

## 구현한 것

- `SourceDomain` 타입 추가: `ai`, `backend`, `frontend`, `devops`
- source config `domain` 필드와 allowed value 검증
- `domain` 생략 시 `ai` 기본값 적용
- `enabledDomains` source loading filter
- `ENABLED_DOMAINS` env와 CLI `--domains` 옵션
- cron run/serve, ingest, digest candidates, wiki query/index, Slack preview/send handoff
- Backend/Frontend/DevOps 후보 source registry 추가
- source metadata domain propagation
- non-AI domain ranking weight
- Slack digest domain section rendering

## 안전장치

- 기본 활성 도메인은 `ai`다.
- 기존 AI source는 `domain`을 생략해도 `ai`로 동작한다.
- 활성 도메인 밖 source는 `enabled: true`여도 fetch되지 않는다.
- AI domain ranking weight는 0이라 기존 AI 점수 기준을 유지한다.
- Slack block limit 회귀 테스트를 유지한다.

## 검증

```text
npm run typecheck passed
npm run build passed
npm test -- --run passed

22 test files passed
152 tests passed

focused 008 tests:
source config, ingest filtering, ranking weight, Slack sections, CLI/cron handoff passed
```

공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html
```

## 다음 작업

008 이후에는 `009_personalization`에서 Slack/user preference tuning을 이어갈 수 있다.
