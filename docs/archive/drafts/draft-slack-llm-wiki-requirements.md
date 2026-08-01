# AI Trend Agent - Slack and LLM Wiki Draft Requirements

## 1. 작성 목적

이 문서는 기존 AI Trend Agent 요구사항에 대해, 새로 논의한 "LLM Wiki + Hermes agent + Slack 알림" 방향을 비교하고 보완하기 위한 초안이다.

기존 문서는 이메일, Notion, TTS 중심의 개인 기술 브리핑 시스템을 목표로 한다. 이 초안은 그 방향을 유지하되, Slack을 빠른 알림 채널로 추가하고 LLM Wiki를 장기 지식베이스로 두는 확장안을 정리한다.

## 2. 새 아이디어 요약

사용자는 AI 최신 트렌드를 직접 찾아보는 대신, 매일 또는 필요할 때 Slack으로 요약 브리핑을 받고 싶다.

핵심 구성은 다음과 같다.

- AI 관련 공식 출처, 논문, 오픈소스, 커뮤니티 신호를 수집한다.
- 수집된 항목을 중복 제거하고 중요도 순으로 정렬한다.
- LLM이 요약, 맥락, 실무 영향도를 정리한다.
- LLM Wiki에 항목과 요약, 출처, 태그, 검증 상태를 저장한다.
- Hermes agent가 매일 핵심 흐름을 선별해 Slack으로 보낸다.

## 3. 권장 프로젝트 이름

현재 GitHub repository 이름인 `ai-trend-agent`를 유지하는 것이 적절하다.

이유:

- Slack은 전달 채널 중 하나일 뿐이다.
- 나중에 이메일, Notion, 웹 대시보드, Discord, 검색 UI로 확장해도 어색하지 않다.
- "agent"라는 이름이 수집, 요약, 검증, 전달까지 포함하는 장기 방향과 잘 맞는다.
- `ai-trend-slack-brief`는 기능이 명확하지만 Slack에 너무 묶인다.

따라서 권장 구조는 다음과 같다.

```text
Playground/
  ai-trend-agent/
    docs/
      requirements.md
      draft-slack-llm-wiki-requirements.md
```

## 4. MVP 방향

새 방향의 MVP는 기존 계획보다 더 빠르게 사용자 가치를 확인하는 데 초점을 둔다.

### 4.1 MVP 목표

하루 한 번 AI 트렌드 브리핑을 Slack으로 받는다.

브리핑은 다음 내용을 포함한다.

- 오늘의 핵심 AI 트렌드 3-5개
- 각 항목의 한 줄 요약
- 왜 중요한지
- 실무 영향
- 원문 링크
- 검증 상태
- 나중에 다시 찾기 위한 태그

### 4.2 MVP 수집원

처음에는 공식성과 신뢰도가 높은 출처 위주로 제한한다.

- OpenAI News, API 문서, 릴리즈 노트
- Anthropic News, Claude 문서, 릴리즈 노트
- Google AI, Gemini, Google Cloud AI 업데이트
- Hugging Face Blog
- GitHub Releases 또는 GitHub Trending AI 관련 저장소
- arXiv AI 논문 피드
- Hacker News AI 관련 키워드

소셜 채널은 빠르지만 신뢰도 편차가 크므로 MVP 이후 allow-list 기반으로 추가한다.

### 4.3 Slack 메시지 예시

```text
AI Trend Brief - 2026-07-28

Top Signals

1. OpenAI API update
Summary: ...
Why it matters: ...
Impact: ...
Source: ...
Verification: official source, date verified

2. New open-source model release
Summary: ...
Why it matters: ...
Impact: ...
Source: ...
Verification: needs follow-up

Watchlist
- repo/name: strong GitHub momentum
- paper title: worth reading for agent evaluation
```

## 5. LLM Wiki 역할

LLM Wiki는 단순한 저장소가 아니라, 시간이 지나도 다시 찾을 수 있는 지식베이스다.

저장 대상:

- 원문 항목
- 요약
- 핵심 주장
- 근거 URL
- 게시일과 수집일
- 출처 신뢰도
- 중요도 점수
- 태그
- 관련 항목 링크
- Slack 발송 여부

초기에는 별도 위키 UI를 만들지 않고, 데이터베이스 또는 Markdown/JSON 저장소로 시작해도 된다.

권장 단계:

1. Markdown 또는 JSON 리포트 저장
2. SQLite 또는 Postgres에 구조화 저장
3. 검색 가능한 LLM Wiki API 추가
4. 필요할 때 웹 UI 또는 Notion 연동 추가

## 6. Hermes Agent 역할

Hermes agent는 모든 수집 항목을 그대로 전달하지 않고, 사용자가 볼 만한 변화만 선별한다.

주요 책임:

- 수집 결과를 읽는다.
- 중복 또는 유사 주제를 묶는다.
- 새로움, 중요도, 실무 영향도 기준으로 랭킹한다.
- 검증 상태가 낮은 항목은 조심스러운 표현으로 낮은 위치에 둔다.
- Slack용 짧은 브리핑과 LLM Wiki용 상세 요약을 분리해서 작성한다.

랭킹 기준:

- 공식 출처 여부
- 최근성
- 모델, 가격, 정책, API, SDK, 성능, 보안 관련 변경 여부
- GitHub star 증가 또는 커뮤니티 반응
- 사용자의 관심 태그와의 관련성
- 실제 개발 업무에 미치는 영향

## 7. 기존 요구사항과 새 초안의 차이

| 구분 | 기존 요구사항 | 새 초안 |
| --- | --- | --- |
| 핵심 전달 채널 | 이메일 | Slack |
| 아카이브 | Notion | LLM Wiki |
| 소비 방식 | 아침 이메일, Notion 다시 보기, TTS | Slack 빠른 브리핑, Wiki 검색 |
| 초기 가치 검증 | 로컬 Markdown 리포트 후 이메일/Notion/TTS | Slack digest를 먼저 받아보며 유용성 확인 |
| 에이전트 개념 | LLM Summarizer, Reviewer, Final Editor | Hermes agent가 선별, 랭킹, 전달 책임 |
| 정보 범위 | AI + 백엔드 기술 변화 | AI 최신 트렌드 중심, 백엔드는 선택 태그 |
| 저장 전략 | Notion 중심 아카이브 | 구조화된 LLM Wiki 중심 아카이브 |
| 알림 성격 | 하루 리포트 | 하루 digest + 중요 항목 실시간 알림 가능 |

## 8. 기존 요구사항에서 좋은 점

기존 문서의 다음 방향은 유지하는 것이 좋다.

- 날짜, URL, 중복, 필수 필드는 코드로 검증한다.
- LLM은 사실 검증보다 요약, 맥락, 영향도 분석에 사용한다.
- 공식 출처를 먼저 수집하고 소셜은 나중에 확장한다.
- KST 기준 수집 윈도우를 명확히 둔다.
- 부분 실패가 있어도 가능한 결과를 만든다.
- API 키와 토큰을 코드에 저장하지 않는다.
- 로컬 MVP 이후 GCP 자동화로 확장한다.

## 9. 개선해야 할 부분

### 9.1 Slack 전달 채널 추가

기존 요구사항에는 Slack이 없다.

추가할 내용:

- Slack Incoming Webhook 또는 Slack Bot API 선택
- daily digest 메시지 포맷
- 중요 항목 실시간 알림 기준
- 발송 실패 시 재시도와 로그
- Slack 메시지 길이 제한 대응

### 9.2 LLM Wiki 데이터 모델 추가

Notion만으로는 장기적으로 에이전트가 재사용하기 좋은 구조화 지식베이스가 되기 어렵다.

추가할 내용:

- Topic
- TrendItem
- SourceEvidence
- Digest
- DeliveryLog
- UserInterestProfile

### 9.3 개인화 기준 추가

현재 요구사항은 사용자 관심사 반영이 약하다.

추가할 내용:

- 관심 태그: agents, coding, multimodal, eval, open-source LLM, RAG, backend, cloud
- 낮은 관심 태그
- 제외 키워드
- 중요도 가중치
- Slack에서 feedback action을 받아 다음 랭킹에 반영하는 구조

### 9.4 트렌드 판별 기준 명확화

"최신 트렌드"는 단순히 새 글이 아니라 변화 신호다.

추가할 기준:

- 공식 발표
- 모델 또는 제품 릴리즈
- API/SDK 변경
- 가격, 정책, 사용량 제한 변경
- 논문 또는 benchmark가 널리 언급됨
- GitHub repo 성장
- 여러 출처에서 같은 주제가 반복 등장

### 9.5 Slack과 이메일의 역할 분리

Slack은 빠른 소비에 적합하고 이메일은 긴 리포트에 적합하다.

권장 역할:

- Slack: 핵심 3-5개, 짧은 요약, 바로 볼 링크
- Email: 주간 또는 상세 리포트
- Notion/Wiki: 장기 저장과 검색
- TTS: 출근 중 청취용 선택 기능

## 10. 권장 개발 순서 수정안

기존 Task 001은 유지한다. 다만 사용자 가치를 빨리 확인하려면 Slack을 이메일보다 앞에 둘 수 있다.

권장 순서:

1. 로컬 수집 Markdown 리포트
2. 로컬 LLM 요약
3. Slack daily digest 발송
4. SQLite 또는 Postgres 기반 LLM Wiki 저장
5. Hermes agent 랭킹과 개인화
6. Notion 저장
7. 이메일 주간 리포트
8. TTS
9. GCP 배포
10. 소셜, YouTube, GitHub Trending 확장

## 11. 다음 의사결정

구현 전에 다음을 결정하면 된다.

- Slack은 Incoming Webhook으로 시작할지, Bot API로 시작할지
- LLM Wiki 초기 저장소를 Markdown/JSON으로 둘지, SQLite/Postgres로 둘지
- Hermes agent를 프로젝트 내부 모듈명으로 둘지, 별도 서비스명으로 둘지
- AI 트렌드만 우선할지, 기존처럼 백엔드 기술 변화도 함께 볼지
- 매일 알림만 할지, 중요한 공식 업데이트는 실시간 알림도 할지

## 12. 추천 결론

현재 repository 이름 `ai-trend-agent`는 유지한다.

기존 요구사항은 버리지 않는다. 대신 Slack과 LLM Wiki를 다음과 같이 추가하는 것이 좋다.

- `Slack`은 MVP 전달 채널로 앞당긴다.
- `LLM Wiki`는 Notion보다 agent 친화적인 장기 저장소로 설계한다.
- `Hermes agent`는 요약기가 아니라 선별, 랭킹, 전달 책임을 가진 coordinator로 정의한다.
- 이메일, Notion, TTS는 나중 단계의 소비 채널로 남긴다.
