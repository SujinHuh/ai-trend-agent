# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 005: Hermes Cron 작업자`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- Slack digest를 정해진 실행 단위로 만들고 발송할 수 있는 `runHermesCron` worker를 추가했습니다.
- `cron:run`, `cron:serve` CLI를 추가했습니다.
- HTTP `POST /cron` endpoint를 추가했습니다.
- `cron_runs` 감사 테이블과 store 메서드를 추가했습니다.
- dry-run/send mode, idempotency key, active send claim guard를 추가했습니다.
- production secret fail-closed, request body/content-type guard, error redaction, project path scope 보호를 보강했습니다.
- Hermes는 저권한 판단/호출 주체이고, 실제 secret과 side effect는 worker가 담당하는 보안 방향을 문서에 반영했습니다.

## ❓ 변경 이유

- 사용자가 매일 정해진 시간에 AI trend Slack digest를 받으려면 수동 발송(Task 004)을 예약 실행 가능한 worker 흐름으로 확장해야 합니다.
- 중복 발송, 인증 누락, webhook/secret 노출을 막기 위해 cron 실행 자체를 감사 가능한 단위로 저장해야 합니다.
- 이후 Task 006에서 Cloud Run과 Cloud Scheduler로 운영 배포하기 위한 HTTP/CLI contract를 먼저 고정했습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [x] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
npm test
git diff --check
npm run cron:run -- --date=2026-08-02 --dry-run
npm run cron:run -- --date=2026-08-02 --send
```

- typecheck 통과
- 전체 테스트 통과: 17 files / 111 tests
- Task 005 focused 테스트 통과: 7 files / 69 tests
- diff check 통과
- `cron:run --dry-run` 통과
- `SLACK_WEBHOOK_URL`이 없을 때 `cron:run --send`가 네트워크 전에 안전하게 실패하는 것을 확인했습니다.

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

- 이 PR에는 GCP 배포, Cloud Scheduler 생성, Secret Manager 연동, 실제 Hermes 학습 서비스 배포가 포함되지 않습니다.
- 기본 보안 방향은 Hermes를 저권한 agent로 두고, worker가 secret/DB write/Slack 발송을 담당하는 구조입니다.

## 👀 리뷰 요청

- `/cron` 인증과 production fail-closed 동작이 충분한지 확인해주세요.
- 같은 report date에 대한 중복 send 방지가 충분한지 확인해주세요.
- Hermes/Worker 권한 분리 방향이 Task 006 배포 경계와 맞는지 확인해주세요.
