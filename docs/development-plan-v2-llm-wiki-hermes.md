# Development Plan v2 - LLM Wiki, Hermes, Slack

## 1. 목적

이 문서는 `requirements-v2-llm-wiki-hermes.md`를 구현하기 위한 실행 순서를 정의한다.

v2의 목표는 AI 트렌드를 먼저 수집하고, LLM Wiki에 저장한 뒤, Hermes agent의 `/cron` 실행으로 매일 `07:00 KST` Slack digest를 보내는 것이다.

## 2. 개발 원칙

- 먼저 로컬에서 end-to-end 흐름을 만든다.
- LLM Wiki 저장소를 먼저 만들고 Hermes agent를 그 위에 붙인다.
- Slack은 이메일보다 먼저 붙인다.
- MVP는 daily digest만 발송한다.
- urgent alert는 MVP에서 즉시 발송하지 않고 후보 분리만 한다.
- GCP 배포는 로컬에서 수집, 저장, Slack 발송이 확인된 뒤 진행한다.
- Backend, Frontend, DevOps는 구조만 열어두고 MVP digest 대상은 AI로 제한한다.

## 3. 왜 LLM Wiki부터 만드는가

Hermes agent는 판단하고 전달하는 역할이다. 판단하려면 먼저 저장할 구조가 필요하다.

LLM Wiki가 없으면 수집 결과, 중복 판단, 이전 digest, Slack 발송 여부, 중요도 점수를 안정적으로 재사용할 수 없다.

따라서 구현 순서는 다음과 같다.

```text
LLM Wiki
-> 수집/정규화
-> 요약/랭킹
-> Slack 발송
-> Hermes /cron
-> GCP 운영
```

## 4. Phase 0: 문서 기준 정렬

목표:

- 기존 문서와 v2 문서의 관계를 명확히 한다.

포함 범위:

- README에 v2 요구사항과 v2 개발 계획 링크 추가
- 기존 `development-plan.md`는 legacy plan으로 유지
- v2 구현 기준은 이 문서와 `requirements-v2-llm-wiki-hermes.md`를 우선으로 명시

완료 기준:

- README에서 v2 요구사항과 v2 개발 계획을 찾을 수 있다.
- 작업 로그에 v2 개발 계획 추가가 기록된다.

## 5. Phase 1: LLM Wiki 로컬 저장소

목표:

- SQLite 기반 LLM Wiki MVP를 만든다.

포함 범위:

- SQLite 연결
- migration 또는 schema 초기화
- `TrendItem` 저장
- `Digest` 저장
- `SourceEvidence` 저장
- canonical URL 기반 중복 방지
- 날짜별 digest 조회
- stable ID 생성

완료 기준:

- 로컬 명령으로 DB를 초기화할 수 있다.
- 샘플 TrendItem을 저장하고 다시 조회할 수 있다.
- 같은 canonical URL은 중복 저장되지 않는다.
- Digest와 TrendItem 관계를 조회할 수 있다.

## 6. Phase 2: Source Registry와 AI 공식 출처 수집

목표:

- AI 공식 출처 중심으로 수집 파이프라인을 만든다.

포함 범위:

- OpenAI, Anthropic, Google AI, Hugging Face 등 공식 출처 5-8개
- RSS, Atom, HTML, GitHub Releases 중 필요한 parser
- URL, 날짜, 필수 필드 검증
- KST 수집 윈도우 필터링
- raw snapshot 저장
- 수집 결과를 LLM Wiki에 저장

완료 기준:

- 로컬 명령으로 최근 수집 항목이 LLM Wiki에 저장된다.
- 오래된 항목은 daily digest 후보에서 제외된다.
- 실패한 source는 로그에 남고 전체 작업은 계속된다.

## 7. Phase 3: TrendItem 생성과 랭킹

목표:

- 수집 항목을 Slack digest에 보낼 수 있는 `TrendItem`으로 만든다.

포함 범위:

- LLM 요약
- `whyItMatters` 생성
- `practicalImpact` 생성
- tag와 domain 부여
- confidence score 계산
- importance score 계산
- urgent alert 후보 분리

완료 기준:

- 각 TrendItem은 원문 링크, 요약, 중요도, 검증 상태를 가진다.
- 기본 domain은 `ai`다.
- urgent alert 후보는 별도 목록으로 분리된다.
- LLM이 원문에 없는 내용을 확정적으로 쓰지 않도록 프롬프트와 검증 규칙을 둔다.

## 8. Phase 4: Slack 수동 발송

목표:

- Slack Incoming Webhook으로 daily digest를 수동 발송한다.

포함 범위:

- Slack 메시지 템플릿
- Top AI Signals 3-5개
- urgent candidate 섹션
- Watchlist 섹션
- 원문 링크
- LLM Wiki stable ID
- delivery attempt log

완료 기준:

- 로컬 명령으로 Slack 테스트 채널에 digest가 도착한다.
- Slack 발송 성공/실패가 LLM Wiki 또는 로그에 기록된다.
- Incoming Webhook 응답은 message ID가 아니라 HTTP status 중심으로 기록한다.

## 9. Phase 5: Hermes `/cron` 연결

목표:

- Hermes `/cron`이 매일 `07:00 KST`에 digest 작업을 실행하도록 연결한다.

포함 범위:

- Hermes `/cron` schedule 설정
- Cloud Run HTTP endpoint 또는 로컬 endpoint 설계
- worker entrypoint 작성
- idempotency key 설계
- 중복 발송 방지
- 실패 시 재시도 정책

완료 기준:

- 같은 날짜의 digest가 중복 발송되지 않는다.
- `/cron` 실행 결과가 로그에 남는다.
- 실패한 단계가 수집, 요약, 저장, Slack 발송 중 어디인지 구분된다.

## 10. Phase 6: GCP 배포

목표:

- 로컬에서 검증된 흐름을 GCP 운영 환경으로 옮긴다.

포함 범위:

- Cloud Run 배포
- Secret Manager 연동
- Cloud SQL PostgreSQL 또는 Firestore 선택
- Cloud Logging
- Cloud Storage raw snapshot 저장
- Hermes `/cron -> Cloud Run HTTP endpoint` 연결

완료 기준:

- GCP에서 매일 `07:00 KST` digest가 Slack으로 발송된다.
- Slack webhook과 LLM API key는 Secret Manager에서만 읽는다.
- 실패 로그를 Cloud Logging에서 확인할 수 있다.

## 11. Phase 7: 소셜 allow-list 확장

목표:

- 빠른 AI 소식 채널을 제한적으로 추가한다.

포함 범위:

- X/Twitter allow-list 계정
- Threads allow-list 계정
- Reddit, Hacker News 키워드 수집
- 공식 출처와 소셜 출처 구분
- 낮은 신뢰도 정책

완료 기준:

- 소셜 출처 항목은 `needs_review` 또는 `low_confidence` 상태로 시작한다.
- 공식 출처와 교차 확인되지 않은 항목은 확정 표현을 쓰지 않는다.

## 12. Phase 8: 도메인 확장

목표:

- AI 외 Backend, Frontend, DevOps digest를 추가할 수 있게 확장한다.

포함 범위:

- domain별 source registry
- domain별 tag
- domain별 ranking weight
- Slack section 분리
- `enabledDomains` 설정

완료 기준:

- 기본값은 `enabledDomains = ["ai"]`다.
- 설정 변경으로 Backend, Frontend, DevOps 섹션을 켤 수 있다.
- 각 도메인은 서로 다른 source와 ranking 기준을 가질 수 있다.

## 13. Phase 9: Slack 피드백과 개인화

목표:

- 사용자가 Slack에서 준 피드백을 다음 랭킹에 반영한다.

포함 범위:

- Slack Bot API 전환 검토
- 관심 있음
- 나중에 보기
- 숨기기
- 태그 가중치 조정
- muted tags

완료 기준:

- 사용자 피드백이 `UserInterestProfile`에 저장된다.
- 다음 digest 랭킹에 피드백이 반영된다.

## 14. MVP에서 하지 않을 것

- 매시간 Slack digest
- urgent alert 즉시 발송
- YouTube 영상 요약
- Instagram 수집
- X/Twitter 전면 수집
- Threads 전면 수집
- Notion 저장
- 이메일 발송
- TTS
- 웹 UI
- Backend, Frontend, DevOps full digest

## 15. 첫 구현 추천

가장 먼저 할 작업은 Phase 1이다.

```text
SQLite 기반 LLM Wiki 저장소 만들기
```

첫 PR 또는 첫 task 이름은 다음을 권장한다.

```text
001_llm_wiki_local_store
```

이 task가 끝나면 Hermes agent와 Slack은 임시 데이터가 아니라 실제 저장된 TrendItem과 Digest를 기준으로 동작할 수 있다.
