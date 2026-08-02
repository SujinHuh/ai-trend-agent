# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 005: Hermes Cron 작업자`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- `cron_runs` audit table과 store method를 추가했습니다.
- Slack digest 발송을 재사용 가능한 service로 분리했습니다.
- `runHermesCron` worker를 dry-run/send mode로 추가했습니다.
- cron idempotency와 active send claim guard를 추가했습니다.
- optional bearer auth가 있는 HTTP `POST /cron` endpoint를 추가했습니다.
- `cron:run`, `cron:serve` script를 추가했습니다.
- cron worker, HTTP endpoint, CLI, schema, store 테스트를 추가했습니다.

## ❓ 변경 이유

- Task 004의 수동 Slack 발송을 매일 자동 실행 가능한 `/cron` 작업으로 연결해야 합니다.
- 같은 날짜 digest가 중복 발송되지 않도록 idempotency guard가 필요합니다.
- Hermes agent가 직접 비밀키와 강한 실행 권한을 갖지 않고, 제한된 `/cron` 호출만 요청하는 구조를 준비해야 합니다.

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
npm test
npm run cron:run -- --date=2026-08-02 --dry-run
npm run cron:run -- --date=2026-08-02 --send
```

- typecheck 통과
- 전체 테스트 통과: 17 files / 101 tests
- related Task 005 tests 통과: 5 files / 45 tests
- `cron:run` dry-run 통과
- `cron:run --send`는 `SLACK_WEBHOOK_URL` 미설정 상태에서 네트워크 전 단계에서 안전하게 실패하는 것을 확인했습니다.

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

없음

## 💡 추가 설명

- Completion 문서:
  - `docs/showcase/005_hermes_cron/completion.md`
  - `docs/showcase/005_hermes_cron/completion.html`
- 공개 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/005_hermes_cron/completion.html
```

- 이 PR에는 GCP deployment, Cloud Scheduler setup, Secret Manager integration, real Hermes account schedule setup, real Slack webhook commit이 포함되지 않습니다.
- 보안 방향은 Hermes agent를 낮은 권한의 호출 주체로 두고, Slack webhook/DB write/Secret Manager 접근은 worker에 남기는 구조입니다.
- 예정된 Slack digest 방향은 유지하며, 기본 실행 시각은 매일 `07:00 KST`입니다.

## 👀 리뷰 요청

- `/cron` endpoint가 인증 없이 운영 노출되지 않도록 구성 가능한지 확인해주세요.
- idempotency guard가 같은 날짜 중복 발송을 막는지 확인해주세요.
- Hermes가 학습/판단을 하더라도 원문 secret이나 full webhook URL을 학습 메모리에 저장하지 않는 구조인지 확인해주세요.
