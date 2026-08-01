# Acceptance Criteria

이 문서는 v2 제품 기준의 수용 기준이다.

v2의 우선 기준은 다음 문서다.

- `docs/requirements-v2-llm-wiki-hermes.md`
- `docs/development-plan-v2-llm-wiki-hermes.md`
- `docs/implementation-sequence-v2.md`

Task 001처럼 개별 작업은 각 작업 폴더의 `requirements.md`, `phase_status.md`, `validation_report.md`를 우선 기준으로 삼는다.

## 1. LLM Wiki 로컬 저장소

- 로컬 SQLite DB를 초기화할 수 있다.
- `TrendItem`, `Digest`, `SourceEvidence`를 저장할 수 있다.
- Digest와 TrendItem 관계를 저장하고 조회할 수 있다.
- 같은 canonical URL 또는 canonical hash는 중복 저장하지 않는다.
- stable ID는 같은 입력에 대해 항상 같은 값을 만든다.
- 날짜별 digest 조회가 가능하다.
- 로컬 CLI로 초기화, 샘플 저장, 조회를 확인할 수 있다.
- 자동 테스트와 검증 리포트가 남아 있다.
- 사용자가 확인할 수 있는 `completion.md`와 `completion.html`이 있다.

## 2. Ingestion

- 설정된 Source Registry의 활성 source만 수집한다.
- 공식 AI 출처를 먼저 수집한다.
- 수집 실패한 source는 실패 원인을 로그에 남긴다.
- 한 source가 실패해도 전체 수집 작업은 가능한 범위에서 계속된다.
- 수집 결과는 LLM Wiki에 저장된다.
- 같은 URL은 canonical URL 기준으로 중복 저장하지 않는다.
- 오래된 항목은 daily digest 후보에서 제외하거나 review 대상으로 분리한다.

## 3. Verification

- 게시일이 수집 기간 밖이면 제외하거나 낮은 우선순위로 이동한다.
- 공식 출처가 아닌 항목은 신뢰도 점수를 낮게 부여한다.
- 가격, 요금제, 모델명, 버전 번호 변경은 원문 근거가 없으면 확정 표현을 쓰지 않는다.
- LLM 요약은 원문에 없는 내용을 사실처럼 추가하지 않는다.
- 검증 상태는 `passed`, `needs_review`, `excluded` 중 하나로 표현한다.

## 4. Ranking and Digest

- 각 TrendItem은 원문 링크, 요약, 중요도, 검증 상태를 가진다.
- 기본 domain은 `ai`다.
- importance score와 confidence score를 기록한다.
- daily digest에는 Top AI Signals 3-5개가 포함된다.
- urgent alert 후보는 즉시 발송하지 않고 daily digest에서 분리 표시한다.

## 5. Slack Delivery

- MVP의 1차 전달 채널은 Slack이다.
- Slack Incoming Webhook으로 digest를 보낼 수 있다.
- Slack 메시지에는 원문 링크와 LLM Wiki stable ID가 포함된다.
- 발송 성공/실패가 기록된다.
- 같은 날짜 digest가 중복 발송되지 않도록 idempotency 기준을 둔다.

## 6. Hermes Cron

- Hermes `/cron`이 매일 `07:00 KST` 기준으로 실행된다.
- 수집 윈도우는 `Asia/Seoul` 기준으로 계산한다.
- 실패 단계가 수집, 저장, 요약, Slack 발송 중 어디인지 구분된다.
- 같은 날짜 재실행은 중복 발송을 만들지 않는다.

## 7. GCP Operation

- 로컬에서 검증된 흐름을 GCP로 옮긴다.
- Slack webhook과 LLM API key는 Secret Manager에서 읽는다.
- 운영 로그는 Cloud Logging에서 확인할 수 있다.
- raw snapshot은 Cloud Storage 또는 동등한 저장소에 남긴다.
- 운영 DB는 Cloud SQL PostgreSQL 또는 Firestore 중 하나로 전환 판단한다.

## 8. Completion Showcase

- 각 큰 구현 단계가 끝나면 `docs/showcase/<task>/completion.md`를 만든다.
- 같은 내용을 `completion.html`로 제공한다.
- GCP VM에서 사용자가 외부 접속해야 하는 경우 nginx 공개 경로에 HTML을 배치한다.
- 외부 URL은 `docs/logs/YYYY-MM-DD.md`와 최종 응답에 남긴다.
- 서버 내부 `curl 200 OK`와 사용자 브라우저 접근 가능성을 구분해 기록한다.

## 9. Post-MVP Channels

다음 항목은 MVP 1차 수용 기준이 아니라 후속 확장 기준이다.

- Email
- Notion
- TTS
- Web UI
- Slack interactive feedback
- X/Twitter, Threads, Reddit, Hacker News allow-list
- Backend, Frontend, DevOps full digest
