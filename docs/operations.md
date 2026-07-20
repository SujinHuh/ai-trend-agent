# Operations

## 1. 시간 기준

운영 시간은 항상 한국 시간 기준이다.

기준:

- Timezone: `Asia/Seoul`
- 발송 목표 시각: 매일 `07:00 KST`
- 수집 종료 시각: 당일 `06:50 KST`
- 수집 시작 시각: 전날 `07:00 KST`
- 가공 버퍼: 10분

예시:

```text
2026-07-19T07:00:00+09:00 <= effectivePublishedAt < 2026-07-20T06:50:00+09:00
```

## 2. GCP Scheduler 기준

Cloud Scheduler는 스케줄 평가 타임존을 별도로 지정해야 한다.

필수 원칙:

- Cloud Scheduler job은 `Asia/Seoul` 타임존으로 생성한다.
- UTC 기본값에 의존하지 않는다.
- 애플리케이션도 동일하게 `Asia/Seoul` 기준으로 리포트 날짜와 수집 윈도우를 계산한다.

예상 gcloud 설정:

```bash
gcloud scheduler jobs create http ai-trend-agent-daily \
  --schedule="0 7 * * *" \
  --time-zone="Asia/Seoul" \
  --uri="CLOUD_RUN_URL" \
  --http-method=POST
```

## 3. 중복 실행 대비

Cloud Scheduler는 같은 스케줄에 대해 작업이 한 번 이상 실행될 수 있으므로, 앱은 같은 날짜 리포트가 중복 생성되더라도 안전해야 한다.

원칙:

- `reportDate` 기준으로 결과 경로를 고정한다.
- 같은 날짜 재실행은 동일 파일을 덮어쓰거나 새 버전으로 저장한다.
- 이메일 발송 단계에서는 중복 발송 방지 키를 둔다.

