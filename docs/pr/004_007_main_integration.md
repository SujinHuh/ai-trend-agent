# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Tasks 004-007: main 통합`

- [ ] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [x] 기타

## 🔍 변경 내용 요약

- 이미 merge 처리된 Task 004, 005, 006, 007 변경분을 `main`에 실제 반영하는 통합 PR입니다.
- Task 004 Slack 수동 발송, Task 005 Hermes `/cron`, Task 006 GCP Cloud Run 배포, Task 007 social allow-list 수집 경계를 한 번에 `main`으로 가져옵니다.
- stacked PR의 base가 feature branch였기 때문에, GitHub에서 MERGED 상태가 되었어도 `main`에는 Task 003까지만 들어와 있던 상태를 정리합니다.
- `docs/pr/004_slack_manual_delivery.md`, `docs/pr/005_hermes_cron.md`를 한국어 PR 템플릿 형식으로 보강했습니다.

## ❓ 변경 이유

- 007B를 시작하려면 `main`이 최소한 004-007 완료 상태를 기준선으로 가져야 합니다.
- 현재 `main` 기준으로 바로 007B를 시작하면 Slack delivery, Hermes cron, Cloud Run deployment, social allow-list 기반 코드가 누락된 상태에서 후속 구현을 하게 됩니다.
- 따라서 007B 시작 전 통합 PR을 먼저 merge해야 합니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [x] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
git diff --check
npm run typecheck
npm run build
npm test
```

- diff check 통과
- typecheck 통과
- build 통과
- 전체 테스트 통과: 20 files / 127 tests

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

없음

## 💡 추가 설명

- 이 PR이 merge된 뒤에 `main`을 pull하면 004-007까지 로컬 기준선이 정리됩니다.
- 그 다음 진행할 작업은 `007B_social_live_collectors`입니다.
- 007B는 HN/Reddit live polling을 우선 검토하고, X/Threads는 token scope, rate limit, platform policy, app review 확인 전까지 계속 Deferred로 둡니다.

## 👀 리뷰 요청

- `main` diff에 004-007 산출물이 모두 포함되는지 확인해주세요.
- secret 원문, Slack webhook URL, auth code가 repo에 들어오지 않았는지 확인해주세요.
- 007B 시작 전 기준선으로 적절한지 확인해주세요.
