# Task 007C 검증 보고서 - LLM 다이제스트 지능화

## 현재 상태

Task 007C 구현, 검증, completion report, GCP 공개 확인, PR handoff까지 완료했다.

PR #9는 merge 완료되었고, Task 007C PR #10은 `main` 기준으로 열려 있다.

```text
PR: https://github.com/SujinHuh/ai-trend-agent/pull/10
GCP: http://34.22.67.160/ai-trend-agent/showcase/007C_llm_digest_intelligence/completion.html
```

## 구현 내용

- LLM 다이제스트 보강용 provider 인터페이스 추가
- 상위 digest candidate만 받는 prompt DTO 추가
- Slack webhook, bearer token, API key, auth code, secret env name redaction 추가
- structured JSON 응답 parser 추가
- candidate ID allow-list, 점수 보정, invalid enum rejection 추가
- `llm_usage_logs` SQLite 테이블과 store API 추가
- 같은 timestamp usage log ID 충돌 방지 sequence 추가
- selected digest candidate LLM enrichment 추가
- LLM output이 deterministic `confirmationStatus`를 덮어쓰지 못하도록 보호
- Slack digest async handoff 추가
- `--llm-digest`, `LLM_DIGEST_ENABLED=true` opt-in 경로 추가
- 기본 Slack/cron 경로는 LLM-off 유지

## 보안/정책 검토

1. Prompt builder는 `DigestCandidate` 데이터만 받고 Slack webhook URL, cron secret, env object, CLI/cron 전체 input은 받지 않는다.
2. Provider 호출 전 prompt text에 redaction을 적용한다.
3. LLM output은 JSON으로 parsing하고, 이미 선택된 candidate ID만 target으로 허용한다.
4. LLM output은 `confirmationStatus`를 설정하지 못한다.
5. LLM이 제안한 action level은 trust gate를 다시 통과한다.
6. provider error, malformed JSON, invalid enum, daily cap fallback, disabled mode는 deterministic digest로 fallback한다.
7. provider 응답 이후 parser/save fallback이 발생해도 실제 token/cost usage를 기록한다.

## 서브 에이전트 검수

사전 검수:

- prompt boundary, confirmation policy, cost logging, fallback, candidate limit, Slack/cron idempotency risk를 확인했다.

중간 구현 검수 지적과 반영:

- High: provider 응답 이후 parser/save fallback에서 token을 `0`으로 기록하던 문제를 지적받았다. 실제 provider usage를 fallback log에 넘기도록 수정했다.
- Medium: daily cap이 단일 응답만 사후 확인하던 문제를 지적받았다. 같은 날짜 기존 usage 합산을 먼저 확인하도록 수정했다.
- Medium: CLI/cron opt-in provider wiring이 없던 문제를 지적받았다. `--llm-digest`, `LLM_DIGEST_ENABLED=true` 경로를 추가했다.
- Medium: 같은 timestamp usage log ID 충돌 가능성을 지적받았다. sequence를 stable ID input에 추가했다.
- Low: invalid enum을 조용히 무시하던 문제를 지적받았다. invalid enum은 parser error로 처리하도록 수정했다.

보완 후 재검수:

- blocking finding 없음.
- 남은 non-blocking note: 실제 외부 LLM provider SDK adapter는 이번 범위가 아니며, provider abstraction과 injectable opt-in path까지만 구현했다.

최종 전체 검수:

- code blocker 없음.
- README docs와 remaining implementation plan 상태 불일치 지적을 반영했다.

## 검증 명령

통과:

```text
npm run typecheck
npm run build
git diff --check
npm test -- tests/digest-intelligence.test.ts
npm test -- tests/digest-intelligence.test.ts tests/llm-wiki-store.test.ts tests/schema.test.ts
npm test -- tests/slack-renderer.test.ts tests/cli.test.ts tests/cron-worker.test.ts
npm test -- tests/cli.test.ts tests/digest-intelligence.test.ts tests/schema.test.ts tests/cron-worker.test.ts
npm test
curl -I http://34.22.67.160/ai-trend-agent/showcase/007C_llm_digest_intelligence/completion.html
```

## 테스트 범위

단위 테스트:

```text
tests/digest-intelligence.test.ts: 10 tests passed
```

- prompt redaction
- structured parser
- token/cost 계산
- daily cap
- usage log ID 충돌 방지
- deterministic fallback

저장소/스키마 테스트:

- `llm_usage_logs` 생성
- index 생성
- user_version update
- usage 저장/조회

통합/회귀 테스트:

```text
tests/cli.test.ts: 16 tests passed
tests/cron-worker.test.ts: 8 tests passed
tests/schema.test.ts: 11 tests passed
```

- `slack:preview --llm-digest` opt-in provider injection
- 기본 Slack preview LLM-off 유지
- 기존 Slack renderer, CLI, cron worker 동작 유지

전체 테스트:

```text
22 files passed
144 tests passed
```

## 제외한 테스트

- 실제 외부 LLM provider API 호출 테스트는 제외했다.
- 이유: 007C MVP는 real provider SDK adapter가 아니라 provider abstraction과 injectable opt-in path까지가 범위다.
- 후속 provider adapter task에서 실제 provider credential, rate limit, billing, network policy를 확인한 뒤 live/API 테스트를 추가한다.

## 공개 확인

```text
GCP nginx completion HTML: HTTP 200
Body line count: 264
```

URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007C_llm_digest_intelligence/completion.html
```
