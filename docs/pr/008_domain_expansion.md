# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 008: 도메인 확장`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- source registry에 `domain` 필드를 추가하고 허용 값 `ai`, `backend`, `frontend`, `devops`를 검증합니다.
- 기본 활성 도메인은 `ai`로 유지합니다.
- `--domains=ai,backend` CLI 옵션과 `ENABLED_DOMAINS=ai,backend` 환경 변수를 추가했습니다.
- disabled domain source가 fetch, ranking, Slack 출력 대상에 들어가지 않도록 source load 단계에서 필터링합니다.
- Backend, Frontend, DevOps 후보 source를 registry와 문서에 추가했습니다.
- domain별 ranking weight를 적용하되 AI 기본 weight는 `0`으로 유지했습니다.
- Slack digest를 domain section으로 분리해 렌더링할 수 있게 했습니다.
- CLI/cron 경로에 domain 설정 handoff를 연결했습니다.

## ❓ 변경 이유

- v2 요구사항은 AI 외 Backend, Frontend, DevOps 도메인을 확장할 수 있는 구조를 요구합니다.
- 기본 운영은 기존 AI digest를 깨지 않아야 하므로 `enabledDomains=["ai"]`를 유지해야 합니다.
- domain disabled source가 fetch되면 비용, 속도, 운영 노이즈가 늘 수 있어 source loading 단계에서 차단해야 합니다.
- Slack digest는 도메인이 늘어날수록 한 목록보다 domain section이 읽기 쉽습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
통과

npm run build
통과

npm test
통과: 22 files / 152 tests

git diff --check
통과

curl -I http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html
통과: HTTP 200
```

테스트 범위:

- 단위 테스트: source config domain 기본값/검증, ranking weight, Slack section rendering
- 통합/CLI 테스트: disabled domain fetch 방지, `ingest:run --domains=...`, `cron:run --domains=...`
- 회귀 테스트: 기존 AI 기본값, Slack block limit, cron dry-run, LLM digest opt-in 경로
- 제외 테스트: 신규 Backend/Frontend/DevOps source live network fetch와 실제 Slack webhook 전송

## 🔗 연관 이슈

N/A

## 💡 추가 설명

- GCP public completion HTML:
  `http://34.22.67.160/ai-trend-agent/showcase/008_domain_expansion/completion.html`
- 완료 보고서:
  - `docs/showcase/008_domain_expansion/completion.md`
  - `docs/showcase/008_domain_expansion/completion.html`
- 검증 보고서:
  - `docs/task/008_domain_expansion/validation_report.md`

## 👀 리뷰 요청

- `enabledDomains` 기본값이 기존 AI digest 회귀를 충분히 막는지 확인 부탁드립니다.
- source load 단계 domain filtering이 ingest, Slack, cron 경로에 일관되게 적용되는지 확인 부탁드립니다.
- Slack domain section이 기존 block limit과 urgent section 정책을 깨지 않는지 확인 부탁드립니다.
