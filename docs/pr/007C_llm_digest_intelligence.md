# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 007C: LLM 다이제스트 지능화`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- LLM 다이제스트 보강용 provider 인터페이스를 추가했습니다.
- deterministic ranking으로 고른 상위 후보만 LLM 입력으로 보내는 prompt DTO를 추가했습니다.
- Slack webhook, bearer token, API key, auth code, secret env name이 prompt에 들어가지 않도록 redaction을 추가했습니다.
- LLM 응답 JSON parser에 candidate ID allow-list, 점수 보정, 잘못된 enum 거부 처리를 추가했습니다.
- `llm_usage_logs` SQLite 테이블과 저장/조회 API를 추가했습니다.
- provider 응답 이후 parser/save fallback이 발생해도 실제 token/cost usage가 기록되도록 했습니다.
- 같은 날짜 usage 합산 기준 daily cap fallback을 추가했습니다.
- 같은 timestamp로 usage log를 여러 번 저장해도 ID가 충돌하지 않도록 sequence guard를 추가했습니다.
- LLM 보강 결과가 deterministic `confirmationStatus`를 승격하지 못하도록 했습니다.
- Slack digest async handoff와 CLI/cron opt-in 경로를 추가했습니다.
- 007C validation report와 completion markdown/html을 기존 report 형식에 맞춰 추가했습니다.

## ❓ 변경 이유

- 007B 이후 HN/Reddit live signal은 받을 수 있지만, 사람이 읽을 Slack daily digest의 요약/판단 품질은 deterministic synthesis만으로 제한됩니다.
- LLM 기능은 secret, 정책, 비용 리스크가 있어서 실제 외부 provider SDK보다 provider 추상화, prompt 경계, token/cost logging, fallback 안전장치를 먼저 고정했습니다.
- 기존 crawler-only mode는 비용 없이 계속 동작해야 하므로 LLM 보강은 명시적으로 켠 경우에만 동작하게 했습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [x] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 명령:

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

검증 결과:

- typecheck 통과
- build 통과
- diff check 통과
- 007C focused test 통과: 10 tests
- CLI/schema/cron regression test 통과: 45 tests
- 전체 테스트 통과: 22 files / 144 tests
- GCP public completion HTML 확인 통과: HTTP 200, 264-line body

테스트 범위:

- 단위 테스트: prompt redaction, structured parser, token/cost 계산, daily cap, usage log ID 충돌 방지, deterministic fallback.
- 저장소/스키마 테스트: `llm_usage_logs` 생성, 인덱스, user_version, usage 저장/조회.
- CLI 통합 테스트: `slack:preview --llm-digest` opt-in provider injection, 기본 Slack preview LLM-off 유지.
- Slack/cron 회귀 테스트: 기존 Slack renderer, CLI, cron worker 동작이 LLM 추가 후에도 깨지지 않는지 확인.
- 실제 외부 LLM provider API 호출 테스트는 이번 범위가 아닙니다. 007C MVP는 provider 추상화와 injectable opt-in 경로까지이며, real provider adapter는 후속 작업입니다.

서브 에이전트 검수:

- 사전 검수 완료: prompt 경계, confirmation policy, 비용 로깅, fallback, Slack/cron 경계 지적 반영.
- 중간 구현 검수 완료: provider 응답 이후 fallback usage logging, daily cap, CLI opt-in, usage ID collision, invalid enum gap 지적 반영.
- 보완 후 재검수 완료: blocking finding 없음.
- 최종 전체 검수 완료: code blocker 없음. README docs와 remaining implementation plan 상태 불일치 지적 반영.

## 🔗 연관 이슈

없음

## 💡 추가 설명

- 007B PR #9는 merge 완료되어 007C PR은 `main` 기준으로 생성했습니다.
- 이번 PR은 실제 외부 LLM provider SDK adapter를 추가하지 않습니다.
- Completion 문서:
  - `docs/showcase/007C_llm_digest_intelligence/completion.md`
  - `docs/showcase/007C_llm_digest_intelligence/completion.html`
- 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007C_llm_digest_intelligence/completion.html
```

## 👀 리뷰 요청

- prompt builder가 secret/env/webhook 값을 받지 않는지 확인해주세요.
- LLM output이 deterministic `confirmationStatus`를 승격하지 못하는지 확인해주세요.
- provider 응답 이후 parser/save fallback에서도 실제 token/cost log가 남는지 확인해주세요.
- 기본 Slack/cron 경로가 LLM-off로 유지되는지 확인해주세요.
- `--llm-digest` opt-in 경로가 provider injection 없이는 real network를 호출하지 않는지 확인해주세요.
