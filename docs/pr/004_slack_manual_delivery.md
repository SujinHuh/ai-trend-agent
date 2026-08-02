# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 004: Slack 수동 발송`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- Task 003 digest candidate를 Slack Incoming Webhook payload로 렌더링하는 기능을 추가했습니다.
- 네트워크 없이 확인 가능한 `slack:preview` CLI를 추가했습니다.
- 명시적으로만 실행되는 `slack:send` CLI를 추가했습니다.
- `slack_delivery_attempts` 감사 테이블과 저장소 메서드를 추가했습니다.
- Slack webhook URL 검증, host-only logging, 에러 메시지 redaction, 중복 발송 방지 로직을 추가했습니다.
- `.env.example`에 `SLACK_WEBHOOK_URL` 설정 항목을 추가했습니다.

## ❓ 변경 이유

- 매일 AI trend digest를 Slack으로 받기 전에, 사람이 먼저 payload를 확인하고 수동으로 발송할 수 있는 안전한 전달 단계를 만들기 위해서입니다.
- webhook 원문 저장/노출을 막고, 실패 로그도 민감정보를 남기지 않도록 delivery audit boundary를 먼저 고정했습니다.
- 자동 cron 발송은 Task 005 범위로 분리했습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
npm test
git diff --check
```

- typecheck 통과
- 전체 테스트 통과: 15 files / 85 tests
- Task 004 focused 테스트 통과: 5 files / 43 tests
- diff check 통과

수동 CLI 검증:

```text
npm run slack:preview -- --date=2026-08-02 --limit=5
npm run slack:send -- --date=2026-08-02 --limit=5
```

- `SLACK_WEBHOOK_URL`이 없을 때 `slack:send`가 네트워크 전에 안전하게 실패하는 것을 확인했습니다.

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

- 이 PR에는 Hermes cron, 예약 발송, Slack Bot API, Slack interactivity가 포함되지 않습니다.

## 👀 리뷰 요청

- Slack webhook URL 원문이 DB, 로그, 문서에 저장되지 않는지 확인해주세요.
- `slack:preview`가 네트워크 없이 payload만 생성하는지 확인해주세요.
- 중복 발송 방지와 `--force-send` 경계가 적절한지 확인해주세요.
