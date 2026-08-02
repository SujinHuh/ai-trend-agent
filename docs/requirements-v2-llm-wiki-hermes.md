# AI Trend Agent Requirements v2 - LLM Wiki and Hermes

## 1. 목적

AI Trend Agent는 빠르게 변하는 AI 트렌드를 사용자가 직접 계속 검색하지 않아도 되도록, 신뢰 가능한 출처와 빠른 신호 채널을 자동 수집하고, LLM Wiki에 지식으로 축적한 뒤, Hermes agent가 핵심 변화만 선별해 Slack으로 알려주는 개인용 AI 트렌드 인텔리전스 시스템이다.

기존 요구사항의 핵심은 "AI를 활용한 일일 리포트 생성"이었다. v2의 핵심은 "LLM Wiki + Hermes agent 기반의 지속적인 AI 트렌드 감지와 Slack 알림"이다.

## 2. 핵심 사용자 문제

AI 모델, 에이전트, 개발 도구, 논문, 오픈소스, 제품 정책, API 변경은 너무 빠르게 변한다.

사용자는 매일 다음 채널을 직접 확인하기 어렵다.

- 공식 블로그와 릴리즈 노트
- LLM 및 AI 제품 문서
- X/Twitter의 공신력 있는 계정
- Threads, Reddit, Hacker News 같은 커뮤니티
- arXiv 논문
- GitHub Trending과 주요 오픈소스 릴리즈
- YouTube, Instagram, 기타 소셜 콘텐츠

이 시스템은 사용자를 대신해 검색, 수집, 검증, 요약, 랭킹, 저장, 알림까지 처리한다.

단, YouTube, Instagram처럼 영상 또는 이미지 중심인 채널은 문제 영역에는 포함하지만 MVP 수집 범위에서는 제외한다.

## 3. 제품 방향

### 3.1 v2 핵심 방향

- LLM Wiki를 장기 지식베이스로 사용한다.
- Hermes agent를 수집, 판단, 요약, 전달을 조율하는 agent로 사용한다.
- Hermes의 `/cron` 기능으로 정해진 시간에 자동 실행한다.
- Slack을 MVP의 1차 알림 채널로 사용한다.
- GCP 위에 배포해 매일 자동으로 동작하게 한다.
- 공식 출처는 높은 신뢰도로 처리하고, 소셜 출처는 낮은 신뢰도 또는 확인 필요 상태로 처리한다.

### 3.2 기존 방향에서 변경되는 점

| 구분 | 기존 요구사항 | v2 요구사항 |
| --- | --- | --- |
| 중심 개념 | AI를 활용한 자동 리포트 | LLM Wiki + Hermes agent |
| 1차 전달 채널 | 이메일 | Slack |
| 아카이브 | Notion | LLM Wiki |
| 실행 방식 | GCP Cloud Scheduler + Cloud Run | Hermes `/cron` + GCP 실행 환경 |
| 주요 사용자 가치 | 아침 리포트를 읽거나 듣기 | 매일 핵심 AI 트렌드를 Slack에서 빠르게 확인 |
| 수집 범위 | AI + 백엔드 기술 | AI 트렌드 우선 구축, 이후 백엔드/프론트엔드/DevOps 도메인 확장 |
| 요약 주체 | LLM Summarizer, Reviewer, Final Editor | Hermes agent가 선별, 랭킹, 요약, 전달 조율 |
| 확장 채널 | Notion, TTS, 이메일 | Slack 우선, 이후 Notion, 이메일, TTS, 웹 UI |

## 4. 주요 구성요소

### 4.1 LLM Wiki

LLM Wiki는 단순 저장소가 아니라, Hermes agent가 계속 참고하고 갱신할 수 있는 AI 트렌드 지식베이스다.

저장 대상:

- 수집된 원문 항목
- 요약
- 핵심 주장
- 원문 링크
- 게시일
- 수집일
- 출처 신뢰도
- 검증 상태
- 중요도 점수
- 관련 키워드
- 관련 프로젝트, 모델, 논문, 회사
- Slack 발송 여부
- 이후 업데이트와의 연결 관계

초기 구현은 DB 기반으로 시작하는 것을 권장한다.

- 로컬 MVP: SQLite
- GCP 운영: Cloud SQL PostgreSQL 또는 Firestore
- 장기 확장: 검색 API, 벡터 검색, 웹 UI

MVP에서 LLM Wiki는 "SQLite 기반 TrendItem + Digest 저장소"로 정의한다.

필수 조건:

- 각 TrendItem은 stable ID를 가진다.
- 각 Digest는 발송 날짜와 수집 윈도우를 가진다.
- Slack 메시지에는 LLM Wiki 상세 URL이 없더라도 stable ID를 포함한다.
- GCP 전환 시 동일한 데이터 모델을 Cloud SQL PostgreSQL 또는 Firestore에 유지한다.

### 4.2 Hermes Agent

Hermes agent는 단순 요약기가 아니라 AI 트렌드 감시자이자 전달 관리자다.

보안 모델:

- Hermes agent는 Docker 또는 Cloud Run 같은 격리된 런타임에서 실행한다.
- Hermes agent는 학습, 판단, 정책 개선, 실행 요청을 담당한다.
- Slack webhook, DB write 권한, Secret Manager read 권한, GCP admin 권한은 Hermes agent에 직접 주지 않는다.
- 강한 실행 권한과 secret 사용은 별도 worker가 담당한다.
- Hermes agent가 보유할 수 있는 secret은 worker 호출용 `CRON_SECRET` 또는 제한된 호출 토큰으로 한정한다.
- Hermes agent가 학습 메모리에 저장할 수 있는 데이터는 실행 결과, 피드백, 정책 메모 같은 비민감 데이터로 제한한다.
- 원본 secret, full webhook URL, 민감한 로그, 사용자 인증 토큰은 학습 메모리에 저장하지 않는다.
- 정해진 시간 AI 트렌드 알림이라는 목적은 유지한다. Hermes는 매일 `07:00 KST` 실행 판단과 worker 호출을 담당하고, worker가 실제 수집, 랭킹, Slack 전송을 수행한다.

주요 책임:

- `/cron`으로 정해진 시간에 실행된다.
- Source Registry에 등록된 출처를 수집한다.
- 중복 항목과 유사 주제를 묶는다.
- 공식 출처와 소셜 신호를 구분한다.
- 최신성, 중요도, 신뢰도, 사용자 관심도 기준으로 랭킹한다.
- LLM Wiki에 저장할 상세 요약을 만든다.
- Slack에 보낼 짧은 digest를 만든다.
- 실패한 출처와 확인 필요한 항목을 숨기지 않고 표시한다.

### 4.2.1 LLM 판단과 토큰 사용 경계

매일 `07:00 KST` AI Trend Slack digest의 최종 목표는 단순 링크 목록이 아니라, 사용자가 바로 읽을 수 있는 요약과 판단이다.

LLM이 필요한 작업:

- 원문 또는 excerpt를 읽고 짧은 `summary`를 만든다.
- 해당 변화가 왜 중요한지 `whyItMatters`를 작성한다.
- 코드, 도구 선택, 비용, 학습, 제품 판단에 주는 `practicalImpact`를 작성한다.
- 중요도, 긴급도, 신뢰도, action level을 판단한다.
- 사용자의 관심 태그와 과거 피드백을 기준으로 digest 후보를 재정렬한다.
- Hermes agent가 실행 결과와 비민감 피드백을 학습해 다음 정책을 개선한다.

LLM이 필요하지 않은 작업:

- RSS, HTML, GitHub release, HN/Reddit feed 같은 공개 출처 fetch
- parser 기반 title, URL, date, excerpt 추출
- canonical URL 중복 제거
- source registry validation
- DB 저장
- Slack Incoming Webhook 발송
- Cloud Scheduler 또는 Hermes의 `/cron` 호출

따라서 크롤링과 Slack 발송만으로는 LLM token 비용이 거의 들지 않는다. 하지만 사람이 읽기 좋은 요약, "왜 중요한지", 개인 관심사 기반 재정렬을 사용하려면 LLM API token 비용이 발생한다.

운영 원칙:

- 모든 수집 항목을 LLM에 넣지 않는다.
- 먼저 deterministic ranking으로 후보를 줄인다.
- 기본 LLM 대상은 상위 5-10개 digest 후보로 제한한다.
- 항목별 원문 전체 대신 title, excerpt, source metadata, canonical URL, 기존 LLM Wiki context를 우선 사용한다.
- full article LLM 요약은 중요도 높은 항목이나 excerpt가 부족한 항목에만 선택적으로 사용한다.
- `cron_runs` 또는 별도 cost log에 `llmInputTokens`, `llmOutputTokens`, `estimatedCostUsd`를 기록한다.
- LLM prompt와 response에는 raw Slack webhook, `CRON_SECRET`, OAuth token, 개인 인증 정보가 절대 들어가지 않아야 한다.

### 4.3 Slack Delivery

Slack은 MVP의 1차 사용자 접점이다.

초기에는 Slack Incoming Webhook을 사용한다.

이유:

- 구현이 단순하다.
- 매일 digest 발송에는 충분하다.
- OAuth, interactive button, slash command가 없어도 시작할 수 있다.

Bot API는 다음 기능이 필요할 때 도입한다.

- Slack 버튼으로 관심 있음, 나중에 보기, 숨기기 피드백 수집
- `/ai-trend` 같은 Slack command
- 특정 항목의 상세 설명을 thread로 제공
- 사용자별 채널 또는 DM 발송

## 5. 알림 주기 전략

MVP의 기본 알림 주기는 매일 아침 `07:00 KST` 1회 digest로 한다.

이유:

- 매시간 알림은 초반에 신호보다 소음이 많아질 가능성이 높다.
- AI 트렌드는 빠르게 변하지만, 대부분의 항목은 하루 단위로 묶어도 의사결정에 충분하다.
- Slack 알림은 너무 잦아지면 사용자가 읽지 않게 된다.
- 처음에는 하루 digest 품질을 높이는 것이 개인화와 랭킹 개선에 더 유리하다.

권장 운영 방식:

- 기본: 매일 아침 `07:00 KST` 1회 digest
- 실행 방식: Hermes agent가 `/cron` 스케줄에 맞춰 worker의 `POST /cron` endpoint를 호출한다.
- 전달 방식: worker가 최신 AI 트렌드를 수집, 랭킹, 요약한 뒤 Slack daily digest로 발송한다.
- 선택 확장: 아침, 점심, 저녁 3회 digest
- MVP 예외: 긴급성이 높은 공식 업데이트는 urgent alert 후보로 분리해 daily digest 상단에 표시
- 이후 확장: urgent alert 후보를 즉시 Slack 알림으로 발송

즉, MVP는 "하루 1회 + 긴급 후보 분리"로 시작한다.

MVP에서 긴급 알림은 실제 즉시 발송까지 구현하지 않는다. 대신 urgent alert 후보를 분리하고 Slack daily digest 상단에 표시한다.

즉시 발송은 다음 단계에서 구현한다.

### 5.1 알림 모드

사용자가 나중에 선택할 수 있도록 알림 모드는 설정값으로 분리한다.

```ts
type DigestMode = "daily" | "three_times_daily" | "hourly";

interface NotificationSchedule {
  mode: DigestMode;
  timezone: "Asia/Seoul";
  dailyTime: "07:00";
  threeTimesDailyTimes: ["07:00", "12:30", "18:30"];
  urgentCandidateDetectionEnabled: boolean;
  urgentImmediateDeliveryEnabled: boolean;
}
```

초기 기본값:

```json
{
  "mode": "daily",
  "timezone": "Asia/Seoul",
  "dailyTime": "07:00",
  "threeTimesDailyTimes": ["07:00", "12:30", "18:30"],
  "urgentCandidateDetectionEnabled": true,
  "urgentImmediateDeliveryEnabled": false
}
```

`hourly` 모드와 긴급 알림 즉시 발송은 MVP에 포함하지 않는다. 나중에 특정 키워드 감시, 주요 모델 릴리즈, API breaking change 감시처럼 긴급 조건이 명확해진 뒤 제한적으로 사용한다.

## 6. 수집 범위

### 6.1 1순위 공식 출처

공식 출처는 높은 신뢰도와 높은 우선순위를 가진다.

- OpenAI News, API 문서, 릴리즈 노트
- Anthropic News, Claude 문서, 릴리즈 노트
- Google AI, Gemini, Vertex AI, Google Cloud AI 업데이트
- Meta AI, Microsoft AI, GitHub Copilot, Hugging Face
- 주요 LLM provider의 모델 카드와 changelog
- 주요 SDK와 API 릴리즈 노트

### 6.2 2순위 연구와 오픈소스

- arXiv AI, LLM, agent, multimodal, evaluation 관련 피드
- Papers with Code
- Hugging Face model release
- GitHub Trending AI 관련 repository
- 주요 오픈소스 LLM, agent framework, eval framework 릴리즈

### 6.3 3순위 빠른 소식 채널

이 채널은 속도는 빠르지만 검증이 약하므로 allow-list 기반으로 시작한다.

- X/Twitter의 공신력 있는 AI 연구자, 회사, 개발자 계정
- Threads의 공식 또는 신뢰 계정
- Reddit의 AI, LocalLLaMA, MachineLearning 관련 커뮤니티
- Hacker News AI 관련 키워드
- 기술 뉴스레터

### 6.4 4순위 영상과 소셜 콘텐츠

초기 MVP에는 포함하지 않고, 이후 확장한다.

- YouTube 공식 채널과 자막 있는 영상
- 기술 컨퍼런스 발표
- Instagram 또는 기타 소셜 콘텐츠

영상과 이미지 중심 콘텐츠는 원문 근거 추출과 저작권, 요약 정확도 리스크가 있으므로 나중 단계로 둔다.

## 7. 도메인 확장 전략

MVP는 AI 트렌드 중심으로 구축한다. 다만 구조는 처음부터 백엔드, 프론트엔드, DevOps 도메인을 추가할 수 있게 설계한다.

도메인 우선순위:

1. AI Trend
2. Backend
3. Frontend
4. DevOps and Cloud

초기에는 AI Trend만 daily digest의 메인 대상이다.

기본 enabled domain은 `["ai"]`다.

이후 확장 시 각 도메인은 별도 태그, 소스, 랭킹 기준, Slack 섹션을 가진다.

예시:

```text
AI Trend
- LLM release
- agent framework
- multimodal
- eval and benchmark
- open-source model

Backend
- Java
- Spring
- database
- API architecture
- distributed system

Frontend
- React
- Next.js
- browser platform
- UI engineering
- design system

DevOps and Cloud
- GCP
- Kubernetes
- Docker
- CI/CD
- observability
- security
```

Slack digest는 처음에는 AI 섹션만 보낸다. 확장 이후에는 다음처럼 섹션을 나눌 수 있다.

```text
AI Trend Brief - 2026-07-28

Top AI Signals
1. ...
2. ...

Backend Watch
- ...

Frontend Watch
- ...

DevOps Watch
- ...
```

## 8. 트렌드 판별 기준

"최신 글"이 곧 "중요한 트렌드"는 아니다.

Hermes agent는 다음 기준으로 트렌드 신호를 판별한다.

- 공식 발표 여부
- 모델, 제품, API, SDK, 가격, 정책, 사용량 제한 변경 여부
- benchmark 또는 eval 결과의 영향력
- 특정 키워드가 여러 출처에서 반복 등장하는지
- GitHub star, fork, release 활동이 급증했는지
- 공신력 있는 계정들이 같은 주제를 언급하는지
- 사용자의 관심 태그와 관련이 높은지
- 실제 개발 또는 제품 의사결정에 영향을 줄 수 있는지

## 9. 검증 원칙

기존 요구사항의 verification-first 원칙은 유지한다.

### 9.1 코드 기반 검증

기계적으로 확인 가능한 항목은 코드가 검증한다.

- URL 접근 가능 여부
- 게시일 또는 업데이트 날짜
- 수집 기간 포함 여부
- canonical URL 중복 여부
- 출처 신뢰도
- 필수 메타데이터 존재 여부
- Slack 발송 여부
- LLM Wiki 저장 여부

### 9.2 LLM 기반 검토

LLM은 사실 생성기가 아니라 요약과 맥락 검토자로 사용한다.

- 원문에 근거한 요약인지 확인한다.
- 과장된 표현을 줄인다.
- 중요한 맥락 누락을 점검한다.
- 사용자의 관심사와 실무 영향도를 정리한다.
- 소셜 출처의 불확실성을 명시한다.

## 10. Slack 알림 요구사항

### 10.1 Daily Digest

Hermes `/cron`은 알림 모드에 따라 정해진 시간에 실행되어 Slack으로 digest를 보낸다.

기본값:

- 실행 시각: 매일 `07:00 KST`
- 수집 윈도우: 전날 `07:00 KST`부터 당일 `06:50 KST`까지
- 가공 버퍼: 10분
- 채널: 설정된 Slack channel
- 알림 모드: `daily`

Slack 메시지에는 다음을 포함한다.

- 오늘의 핵심 AI 트렌드 3-5개
- 각 항목의 한 줄 요약
- 왜 중요한지
- 실무 영향
- 원문 링크
- 검증 상태
- 관련 키워드
- LLM Wiki 상세 링크 또는 식별자

### 10.2 중요 알림 후보

MVP에서는 특정 조건에 해당하는 항목을 urgent alert 후보로 분리하고 daily digest 상단에 표시한다.

MVP 이후에는 이 후보를 daily digest와 별개로 즉시 Slack 알림으로 보낼 수 있다.

대상:

- 주요 LLM provider의 모델 릴리즈
- API breaking change
- 가격 또는 사용량 제한 변경
- 보안 또는 정책 변경
- 사용자의 관심 태그와 매우 높은 관련성이 있는 업데이트

## 11. GCP 운영 요구사항

Hermes agent와 AI Trend worker는 GCP 위에서 분리 실행하는 것을 목표로 한다.

권장 구성:

- Cloud Run service 1: 저권한 Hermes agent container
- Cloud Run service 2: AI Trend worker container
- Hermes `/cron`: worker의 제한된 HTTP endpoint 호출
- Secret Manager: Slack webhook, LLM API key, 소셜 API token 관리. worker만 필요한 secret을 읽는다.
- Cloud SQL PostgreSQL 또는 Firestore: LLM Wiki 저장소
- Cloud Storage: 원문 스냅샷, 긴 본문, 첨부 데이터 저장
- Cloud Logging: 실행 로그, 실패 출처, 발송 결과 기록

MVP 실행 경로:

```text
Hermes agent container
-> scheduled 07:00 KST /cron
-> POST /cron with CRON_SECRET
-> AI Trend worker container
-> AI trend ingestion/ranking/digest
-> LLM Wiki 저장
-> Slack Incoming Webhook 발송
-> Cloud Logging 기록
```

권한 분리:

- Hermes agent container: `CRON_SECRET`, worker endpoint URL, 비민감 정책/피드백 메모리만 보유한다.
- AI Trend worker container: Slack webhook, DB 접근 권한, ingestion/ranking/send 실행 권한을 보유한다.
- Hermes agent가 손상되어도 Slack webhook과 DB write secret이 직접 노출되지 않도록 한다.
- Worker endpoint는 허용된 명령만 제공하고, Hermes의 요청을 인증/검증한 뒤 side effect를 수행한다.

실패 처리 책임:

- Hermes `/cron`: 정해진 시간에 Cloud Run endpoint 호출
- Cloud Run worker: 수집, 요약, 저장, Slack 발송 실행
- Cloud Run worker: 부분 실패와 재시도 처리
- Cloud Logging: 실패 출처, 실패 단계, Slack 발송 결과 기록

타임존 원칙:

- 모든 digest 기준은 `Asia/Seoul`이다.
- UTC 기본값에 의존하지 않는다.
- 리포트 날짜, 수집 윈도우, Slack 발송 시각은 KST로 계산한다.

## 12. MVP 범위

### 12.1 포함

- Source Registry 기반 수집
- 공식 출처 5-8개
- arXiv 또는 GitHub release 중 1개 이상
- 코드 기반 검증
- canonical URL 중복 제거
- LLM 요약, 중요도 판단, `whyItMatters`, `practicalImpact`, 사용자 관심사 기반 재정렬
- LLM Wiki 저장
- Hermes `/cron` 실행 설계
- Slack Incoming Webhook 발송
- 실패 로그
- LLM token 사용량과 추정 비용 기록
- 알림 모드 설정값
- urgent alert 후보 분리
- AI Trend 도메인 우선 구조
- Backend, Frontend, DevOps 도메인 확장 가능 구조

### 12.2 제외

- Slack interactive button
- Slack slash command
- Instagram 수집
- YouTube 영상 요약
- X/Twitter 전면 수집
- Threads 전면 수집
- TTS
- 이메일
- Notion 저장
- 웹 UI
- 완전한 의미 기반 중복 제거
- Backend, Frontend, DevOps full digest
- 매시간 Slack digest
- urgent alert 즉시 발송

## 13. 데이터 모델 초안

### 13.1 TrendItem

```ts
interface TrendItem {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  practicalImpact: string;
  sourceUrls: string[];
  primarySourceUrl: string;
  sourceType: "official" | "research" | "open_source" | "community" | "social";
  publishedAt: string | null;
  fetchedAt: string;
  tags: string[];
  domain: "ai" | "backend" | "frontend" | "devops";
  confidenceScore: number;
  importanceScore: number;
  verificationStatus: "verified" | "needs_review" | "low_confidence";
  llmWikiStatus: "stored" | "failed";
  slackDeliveryStatus: "pending" | "sent" | "failed" | "skipped";
}
```

### 13.2 Digest

```ts
interface Digest {
  id: string;
  digestDate: string;
  timezone: "Asia/Seoul";
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  topItems: TrendItem[];
  domainSections: {
    ai: TrendItem[];
    backend: TrendItem[];
    frontend: TrendItem[];
    devops: TrendItem[];
  };
  watchlistItems: TrendItem[];
  needsReviewItems: TrendItem[];
  urgentCandidateItems: TrendItem[];
  slackDeliveryAttemptId: string | null;
  slackSentAt: string | null;
  slackWebhookResponseStatus: number | null;
  slackMessageTs: string | null;
  deliveryStatus: "sent" | "partial" | "failed";
}
```

`slackMessageTs`는 Slack Bot API 도입 이후에만 채운다. MVP의 Slack Incoming Webhook에서는 `slackDeliveryAttemptId`, `slackSentAt`, `slackWebhookResponseStatus`를 기록한다.

### 13.3 UserInterestProfile

```ts
interface UserInterestProfile {
  id: string;
  highPriorityTags: string[];
  normalPriorityTags: string[];
  mutedTags: string[];
  enabledDomains: Array<"ai" | "backend" | "frontend" | "devops">;
  blockedKeywords: string[];
  preferredDeliveryTime: string;
  timezone: "Asia/Seoul";
}
```

MVP 기본값:

```json
{
  "enabledDomains": ["ai"]
}
```

### 13.4 NotificationSchedule

```ts
type DigestMode = "daily" | "three_times_daily" | "hourly";

interface NotificationSchedule {
  mode: DigestMode;
  timezone: "Asia/Seoul";
  dailyTime: string;
  threeTimesDailyTimes: string[];
  urgentCandidateDetectionEnabled: boolean;
  urgentImmediateDeliveryEnabled: boolean;
}
```

## 14. 권장 개발 순서

1. 기존 Source Registry와 수집 구조 정리
2. 공식 출처 중심 로컬 수집 리포트 생성
3. LLM 요약과 TrendItem 생성
4. Slack Incoming Webhook으로 수동 발송 테스트
5. LLM Wiki 저장소를 SQLite로 로컬 구현
6. Hermes `/cron` 실행 흐름 연결
7. daily 알림 모드와 urgent alert 후보 분리 구현
8. GCP Cloud Run과 Secret Manager 구성
9. GCP 운영 저장소를 Cloud SQL PostgreSQL 또는 Firestore로 전환
10. Slack daily digest 자동 발송
11. X/Twitter, Threads, Reddit, Hacker News allow-list 확장
12. Backend, Frontend, DevOps 도메인 확장
13. GitHub Trending, arXiv, YouTube 확장
14. Slack feedback과 개인화 랭킹 추가

## 15. 수용 기준

- 매일 `07:00 KST` 전후 Slack에 AI Trend Digest가 도착한다.
- Slack digest에는 핵심 항목 3-5개가 포함된다.
- 각 항목에는 원문 링크와 검증 상태가 있다.
- 공식 출처와 소셜 출처가 구분된다.
- 오래된 게시물을 최신 트렌드처럼 보내지 않는다.
- LLM Wiki에 digest와 개별 TrendItem이 저장된다.
- Hermes agent 실행 결과와 Slack 발송 결과가 로그에 남는다.
- 특정 출처가 실패해도 가능한 digest는 발송된다.
- 소셜 신호는 검증되지 않은 사실처럼 표현하지 않는다.
- 기본 알림 모드는 `daily`다.
- urgent alert 조건을 만족하는 공식 업데이트는 별도 알림 후보로 분리되고 daily digest 상단에 표시된다.
- MVP에서는 urgent alert 즉시 발송을 하지 않는다.
- 데이터 모델은 AI 외 Backend, Frontend, DevOps 도메인을 추가할 수 있다.

## 16. 검수 결과

기존 요구사항에서 유지할 부분:

- verification-first 원칙
- KST 기준 운영
- 공식 출처 우선
- 부분 실패 허용
- Secret Manager 기반 비밀값 관리
- 로컬 MVP 후 GCP 배포

v2에서 반드시 바꿔야 할 부분:

- 이메일을 MVP 1차 채널에서 제외하고 Slack을 앞에 둔다.
- Notion을 1차 저장소로 보지 않고 LLM Wiki를 중심 저장소로 둔다.
- Hermes agent와 `/cron`을 실행 흐름의 핵심으로 명시한다.
- MVP는 AI 트렌드 감지를 주목적으로 좁히되, Backend, Frontend, DevOps 확장 구조를 처음부터 열어둔다.
- 소셜 채널은 전면 수집이 아니라 allow-list와 낮은 신뢰도 정책으로 시작한다.
- 알림은 매시간이 아니라 daily digest를 기본값으로 두고, 긴급 업데이트는 MVP에서 후보 분리까지만 처리한다.

최종 판단:

v2 요구사항은 기존 요구사항보다 사용자의 실제 목표에 더 가깝다. 기존 문서는 "리포트를 만드는 자동화"에 가깝고, v2는 "AI 트렌드를 대신 감시하고 Slack으로 알려주는 에이전트"에 가깝다.
