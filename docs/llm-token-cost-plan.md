# LLM Token and Cost Plan

## 목적

매일 `07:00 KST` AI Trend Slack digest를 운영할 때 어떤 단계에서 LLM token 비용이 발생하는지 명확히 한다.

## Token을 쓰지 않는 단계

아래 단계는 HTTP fetch, parser, DB, Slack webhook 중심이므로 LLM token을 사용하지 않는다.

- RSS, HTML, GitHub release, HN/Reddit feed 수집
- title, URL, published date, excerpt 추출
- canonical URL 중복 제거
- source registry validation
- SQLite 또는 향후 Cloud SQL/Firestore 저장
- deterministic ranking
- Slack message rendering
- Slack Incoming Webhook 발송
- Cloud Scheduler 또는 Hermes `/cron` 호출

## Token을 쓰는 단계

아래 단계는 LLM provider 호출이 필요하므로 token 비용이 발생한다.

- 수집 항목을 읽고 짧은 `summary` 생성
- `whyItMatters` 생성
- `practicalImpact` 생성
- 중요도, 긴급도, action level 판단
- 사용자의 관심 태그와 과거 피드백 기반 digest 재정렬
- Hermes agent의 비민감 실행 결과 학습과 정책 개선

## 기본 비용 전략

처음부터 모든 수집 결과를 LLM에 넣지 않는다.

1. crawler가 하루 후보를 수집한다.
2. deterministic ranking이 후보를 줄인다.
3. 상위 5-10개만 LLM 요약/판단 대상으로 보낸다.
4. Slack에는 LLM 요약이 붙은 Top AI Signals를 보낸다.
5. `cron_runs` 또는 별도 usage table에 token과 추정 비용을 기록한다.

## Rough Budget

모델 단가는 바뀔 수 있으므로 실제 운영 전 공식 pricing을 다시 확인한다.

초기 목표 예산:

| Mode | Daily LLM input | Daily LLM output | Expected monthly use |
| --- | ---: | ---: | ---: |
| No LLM crawler-only | 0 | 0 | token cost 없음 |
| Top 5 digest intelligence | 15k-30k | 2k-5k | 저비용 |
| Top 10 digest intelligence | 30k-60k | 4k-10k | 낮음-중간 |
| Broad candidate analysis | 100k+ | 15k+ | 필요할 때만 |

## Required Usage Fields

LLM integration task는 최소한 아래 값을 저장해야 한다.

```ts
interface LlmUsageLog {
  runId: string;
  reportDate: string;
  provider: string;
  model: string;
  purpose: "digest_summary" | "importance_judgment" | "personalized_rerank" | "hermes_policy_update";
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt: string;
}
```

## Security Rules

- Slack webhook URL 원문을 prompt에 넣지 않는다.
- `CRON_SECRET`, OAuth token, API key를 prompt에 넣지 않는다.
- LLM response를 그대로 실행하지 않는다.
- Hermes memory에는 secret, full webhook URL, auth code, 민감 로그를 저장하지 않는다.
- social-only claim은 LLM이 중요하다고 판단해도 `confirmed`로 승격하지 않는다.
