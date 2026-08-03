# Task 008 검증 보고서 - 도메인 확장

## 현재 상태

Task 008 구현과 로컬 검증을 완료했다.

```text
GCP: http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html
```

## 구현 내용

- source registry에 `domain` 필드 추가
- 허용 도메인 `ai`, `backend`, `frontend`, `devops` 검증 추가
- `domain` 생략 시 `ai` 기본값 적용
- 기본 활성 도메인 `ai` 유지
- `enabledDomains` 기반 source loading filter 추가
- `ENABLED_DOMAINS` env와 CLI `--domains=ai,backend` 지원
- CLI/cron source loading에 활성 도메인 전달
- Backend/Frontend/DevOps 후보 source 추가
- source metadata에 domain 추가
- non-AI domain ranking weight 적용
- Slack digest domain section rendering 추가

## 서브 에이전트 검수

사전 검수:

- 008 구현 전 검수 요청을 열어두고 source config schema, enabledDomains filtering, ranking weight, Slack section, CLI/cron handoff risk를 점검 대상으로 지정했다.

현재 반영한 주요 risk:

- 기본 AI digest가 깨지지 않도록 `domain` 기본값과 기본 활성 도메인을 `ai`로 유지했다.
- disabled domain source가 fetch되지 않도록 source loading 단계에서 제외하고 ingest/CLI 테스트로 확인했다.
- Slack block limit 기존 테스트를 유지하면서 domain section rendering 테스트를 추가했다.
- ranking weight는 AI 기본값을 0으로 두어 기존 AI score 회귀를 막고 non-AI domain만 보정했다.

## 검증 명령

통과:

```text
npm run typecheck
npm run build
npm test -- --run tests/source-config.test.ts tests/source-ingest.test.ts tests/trend-ranking.test.ts tests/slack-renderer.test.ts tests/cli.test.ts
npm test -- --run
git diff --check
curl -I http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html
```

## 테스트 범위

단위/통합 테스트:

```text
tests/source-config.test.ts: 10 tests passed
tests/source-ingest.test.ts: 3 tests passed
tests/trend-ranking.test.ts: 4 tests passed
tests/slack-renderer.test.ts: 9 tests passed
tests/cli.test.ts: 18 tests passed
```

전체 테스트:

```text
22 files passed
152 tests passed
```

## 제외한 것

- 실제 외부 source live fetch 검증은 제외했다.
- 이유: 008 범위는 domain schema/filter/render/ranking wiring이며, 신규 후보 source는 기본 비활성 또는 domain 비활성 상태에서 시작한다.

## 공개 확인

GCP 공개 URL에서 HTTP 200과 Task 008 완료 HTML 본문을 확인했다.

```text
http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html
```
