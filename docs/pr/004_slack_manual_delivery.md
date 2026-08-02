# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 004: Slack 수동 발송`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- Task 003 digest 후보를 Slack Incoming Webhook payload로 렌더링하는 기능을 추가했습니다.
- 안전한 `slack:preview` 명령과 명시적인 `slack:send` 명령을 추가했습니다.
- `slack_delivery_attempts` audit table과 store method를 추가했습니다.
- webhook URL validation, host-only logging, error redaction을 추가했습니다.
- `.env.example`에 `SLACK_WEBHOOK_URL` 설정 예시를 추가했습니다.

## ❓ 변경 이유

- Task 003에서 만든 ranking 결과를 사람이 확인 가능한 Slack digest로 수동 발송할 수 있어야 합니다.
- Slack webhook URL은 민감정보이므로 repo, 로그, delivery attempt에 원문이 남지 않도록 보호해야 합니다.
- scheduled delivery와 Hermes `/cron`은 다음 Task 005에서 이 수동 발송 primitive를 재사용하도록 분리했습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
git diff --check
npm run typecheck
npm test
npm run slack:preview -- --date=2026-08-02 --limit=5
npm run slack:send -- --date=2026-08-02 --limit=5
```

- diff check 통과
- typecheck 통과
- 전체 테스트 통과: 15 files / 74 tests
- `slack:preview` 통과
- `slack:send`는 `SLACK_WEBHOOK_URL` 미설정 상태에서 네트워크 전 단계에서 안전하게 실패하는 것을 확인했습니다.

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

없음

## 💡 추가 설명

- Completion 문서:
  - `docs/showcase/004_slack_manual_delivery/completion.md`
  - `docs/showcase/004_slack_manual_delivery/completion.html`
- 공개 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/004_slack_manual_delivery/completion.html
```

- 이 PR에는 Hermes cron, scheduled send, Slack Bot API, Slack interactivity, duplicate-send prevention이 포함되지 않습니다.
- duplicate-send prevention과 scheduled delivery는 Task 005 범위입니다.

## 👀 리뷰 요청

- Slack webhook URL 원문이 로그와 DB에 저장되지 않는지 확인해주세요.
- `slack:send`가 명시 실행일 때만 발송을 시도하는지 확인해주세요.
- delivery attempt가 성공/실패를 감사 가능한 형태로 기록하는지 확인해주세요.
