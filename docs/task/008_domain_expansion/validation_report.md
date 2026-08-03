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

문서/하네스 최종 검수 결과와 반영:

- High: validation report에 실제 서브 에이전트 검수 결과와 반영 내역이 부족했다. 이 섹션에 severity별 finding, 반영 내용, 재검증 명령을 기록했다.
- Medium: completion HTML의 진행률이 `10 / 13`으로 validation/GCP 완료 상태와 불일치했다. `13 / 13`과 PR handoff 완료 대상 문구로 수정했다.
- Medium: GCP 확인 명령만 있고 실제 HTTP status/body 확인 결과가 부족했다. 공개 확인 섹션에 HTTP 200과 body 식별 문자열 확인을 기록했다.
- Low: source registry 문서의 `enabledDomains`가 source별 기본값처럼 보였다. runtime domain filter 기본값 섹션으로 분리했다.

코드 최종 검수 결과와 반영:

- High: `enabledDomains=ai` 실행에서도 DB에 이미 저장된 backend/frontend/devops item이 ranking/Slack 후보로 재노출될 수 있었다. synthesis 입력과 digest candidate 출력에 allowed source name 필터를 추가하고 cron 회귀 테스트를 추가했다.
- Medium: metadata에 없는 source가 Slack/ranking에서 `ai`로 fallback되어 필터 누락을 숨길 수 있었다. 후보 선택 전 allowed source name 필터를 적용해 metadata fallback 전에 비활성 도메인 lineage를 제거했다.
- Medium: `includeDisabled: true` 경로가 disabled source metadata를 ranking/Slack에 다시 줄 수 있었다. digest candidates, wiki, Slack 경로의 source loading을 활성 source 중심으로 정리했다.
- Low: all-AI Slack digest에도 `AI Signals` heading이 추가되어 기존 payload 형식이 바뀌었다. 단일 domain일 때는 기존 후보 목록 형식을 유지하도록 수정하고 테스트를 추가했다.
- Low: `runCliCommand`의 injectable env가 `ENABLED_DOMAINS` 파싱에 반영되지 않았다. `parseOptions(args, env)`로 수정하고 in-process CLI 테스트를 추가했다.
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
tests/slack-renderer.test.ts: 10 tests passed
tests/cli.test.ts: 19 tests passed
tests/cron-worker.test.ts: 9 tests passed
```

전체 테스트:

```text
22 files passed
155 tests passed
```

## 제외한 것

- 실제 외부 source live fetch 검증은 제외했다.
- 이유: 008 범위는 domain schema/filter/render/ranking wiring이며, 신규 후보 source는 기본 비활성 또는 domain 비활성 상태에서 시작한다.

## 공개 확인

GCP 공개 URL에서 HTTP 200과 Task 008 완료 HTML 본문을 확인했다.

```text
HTTP/1.1 200 OK
body includes: Task 008 Domain Expansion Completion
body line count: 260
http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html
```
