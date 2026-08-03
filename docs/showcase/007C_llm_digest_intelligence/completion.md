# LLM 다이제스트 지능화 완료 보고서

## 요약

Task 007C는 Slack daily digest의 요약과 판단 품질을 올리기 위한 LLM 보강 경로를 추가했다.

기본 crawler-only Slack/cron 경로는 계속 LLM-off다. `--llm-digest` 또는 `LLM_DIGEST_ENABLED=true`가 켜지고 provider가 주입된 경우에만 deterministic ranking으로 고른 상위 digest candidate를 LLM으로 보강한다.

## 구현한 것

- LLM 다이제스트 provider 인터페이스
- candidate-only prompt DTO
- provider 호출 전 secret redaction
- structured JSON response parser
- token/estimated cost usage log
- 같은 timestamp usage log ID 충돌 방지
- deterministic confirmation policy를 보존하는 candidate enrichment
- enriched summary, why, impact를 Slack digest에 넘기는 async handoff
- CLI/cron opt-in enable path
- disabled, missing provider, provider error, parser failure, invalid enum, daily cap fallback

## 안전장치

- 기본값에서는 real provider SDK를 호출하지 않는다.
- prompt input은 webhook URL, cron secret, env object, CLI/cron 전체 input을 받지 않는다.
- LLM output은 `confirmationStatus`를 설정하지 못한다.
- action level은 trust gate를 다시 통과한다.
- provider 응답 이후 parser/save fallback이 발생해도 실제 usage를 기록한다.
- 기본 Slack preview/send와 cron dry-run은 crawler-only로 유지된다.

## 검증

```text
npm run typecheck passed
npm run build passed
git diff --check passed
npm test passed

22 test files passed
144 tests passed

focused digest intelligence tests passed: 10 tests
CLI/schema/cron regression tests passed: 45 tests
```

서브 에이전트 검수:

```text
사전 검수 완료
중간 구현 검수 완료
보완 후 재검수 blocking finding 없음
최종 전체 검수 code blocker 없음
```

공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007C_llm_digest_intelligence/completion.html
```

## 다음 작업

007C 이후에는 아래 순서로 진행한다.

- `008_domain_expansion`: Backend, Frontend, DevOps source/domain expansion
- `009_personalization`: Slack/user preference tuning
