# Task 008 계획 - 도메인 확장

## 구현 방향

1. 기존 source config schema에 domain 개념을 추가한다.
2. 기본 domain은 `ai`로 두어 기존 source와 테스트가 깨지지 않게 한다.
3. `enabledDomains`는 별도 config field 또는 CLI/env option으로 제어한다.
4. domain disabled 상태에서는 해당 domain source가 수집/랭킹/Slack digest에 들어가지 않게 한다.
5. Slack renderer는 기존 top list를 유지하면서 domain section을 렌더링할 수 있게 확장한다.

## 리스크

- source config schema 변경은 기존 config와 tests에 영향이 있다.
- Slack payload section 분리는 기존 Slack block limit과 urgent section에 영향이 있다.
- domain weight가 기존 AI ranking을 흔들 수 있다.
- domain disabled source가 fetch를 호출하면 안 된다.

## 검증 계획

- source config 단위 테스트
- domain filtering 단위/통합 테스트
- ranking weight 테스트
- Slack renderer 테스트
- CLI preview regression 테스트
- full test suite

## 문서 산출물

- `phase_status.md`
- `validation_report.md`
- `docs/showcase/008_domain_expansion/completion.md`
- `docs/showcase/008_domain_expansion/completion.html`
- `docs/pr/008_domain_expansion.md`
