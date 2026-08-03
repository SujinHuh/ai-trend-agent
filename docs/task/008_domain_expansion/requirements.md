# Task 008 요구사항 - 도메인 확장

## 목표

AI Trend Agent v2가 AI 외 기술 도메인 digest도 수집, 랭킹, Slack section으로 분리할 수 있게 한다.

Task 008의 범위는 Backend, Frontend, DevOps 도메인을 안전하게 추가할 수 있는 설정/랭킹/렌더링 기반을 만드는 것이다.

## 포함 범위

- domain별 source registry 확장
- `enabledDomains` 설정
- domain별 tag와 source metadata
- domain별 ranking weight
- Slack digest section 분리
- 기존 AI domain 기본 동작 유지
- domain 확장 테스트

## 제외 범위

- 웹 뉴스 화면
- Slack feedback/personalization
- real external LLM provider adapter
- credential이 필요한 paid/private source
- JavaScript rendering이 필요한 웹 페이지 수집
- X/Threads live collector

## 도메인 기준

초기 domain:

- `ai`
- `backend`
- `frontend`
- `devops`

기본 enabled domain:

- `ai`

Backend, Frontend, DevOps source는 config에 추가하되 기본 disabled 또는 domain disabled 상태에서 시작한다. 사용자가 명시적으로 `enabledDomains`를 켜야 digest에 들어간다.

## Acceptance Criteria

1. 기본 실행은 기존 AI digest 결과를 깨지 않는다.
2. source config가 domain 값을 검증한다.
3. `enabledDomains`가 꺼진 domain source는 수집/랭킹/Slack 출력 대상에서 제외된다.
4. Backend, Frontend, DevOps source 후보가 registry에 문서화된다.
5. domain별 ranking weight가 적용된다.
6. Slack digest가 domain별 section을 분리해 렌더링할 수 있다.
7. 테스트는 source config 검증, enabled domain filtering, ranking weight, Slack section rendering, 기존 AI 기본값 회귀를 커버한다.
