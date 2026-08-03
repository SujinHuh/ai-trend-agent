# Task 008 구현 순서 - 도메인 확장

## Numbered Work

1. Branch와 dependency 확인.
2. Task 문서와 phase status 작성.
3. Domain model과 기본값 정의.
4. Source config schema에 domain/allowed domain 검증 추가.
5. `enabledDomains` 설정과 filtering 추가.
6. Backend, Frontend, DevOps source 후보 registry 추가.
7. Domain별 ranking weight 추가.
8. Slack digest domain section rendering 추가.
9. CLI/cron handoff에서 domain 설정 전달.
10. 테스트 작성.
11. 검증 보고서 작성.
12. completion markdown/html 작성과 GCP 공개 URL 확인.
13. PR 템플릿 확인 후 한글 PR 작성과 handoff.

## Guardrails

- 기본 enabled domain은 `ai`다.
- 기존 AI digest 기본 동작을 깨지 않는다.
- domain disabled source는 fetch하지 않는다.
- Slack block limit을 넘기지 않는다.
- 보고서와 PR 본문은 한글로 작성한다.
- 완료 시 GCP 공개 HTML URL을 남긴다.
