# Development Plan

## 1. 구현 전략

AI Trend Agent는 로컬에서 먼저 MVP를 검증한 뒤 GCP에 배포한다.

이유:

- 로컬에서는 API 키, 수집 로직, 요약 품질, 이메일 템플릿을 빠르게 수정할 수 있다.
- GCP부터 붙이면 Cloud Run, IAM, Secret Manager, Scheduler, 로그 설정 때문에 초기 피드백 속도가 느려진다.
- 수집 소스와 LLM 응답은 시행착오가 많으므로 로컬 반복 개발이 유리하다.
- 로컬에서 한 번 end-to-end로 성공한 뒤 GCP에 올리면 배포 문제와 제품 문제를 분리할 수 있다.

## 2. 권장 개발 순서

이 순서는 제품을 사용자에게 빨리 전달하기 위한 순서가 아니라, 구현 리스크를 줄이기 위한 개발 순서다.

핵심 판단:

- 이메일 발송은 사용자 가치 확인이 빠르지만, 요약 품질과 검증 구조가 약하면 매일 잘못된 리포트를 보낼 수 있다.
- 따라서 로컬 CLI에서 리포트 구조와 검증 흐름을 먼저 안정화한다.
- 그 다음 Notion 저장과 TTS를 붙여 리포트 소비 구조를 완성한다.
- 이메일은 Notion 링크와 음성 브리핑 링크를 포함할 수 있는 시점에 붙인다.
- 소셜 수집과 YouTube 확장은 공식 출처 기반 리포트가 안정화된 뒤 붙인다.

### Step 1: 로컬 수집 Markdown 리포트

목표:

- 로컬 명령어 하나로 공식 출처를 수집하고 Markdown 원문 리포트를 생성한다.

포함 범위:

- Source Registry 설정 파일
- 공식 RSS/블로그/GitHub Releases 일부 수집
- 공통 Article 스키마
- 중복 제거
- 날짜 필터링
- 코드 기반 검증
- Markdown 리포트 생성

완료 기준:

- `npm run generate` 또는 유사 명령으로 리포트 파일이 생성된다.
- 리포트 항목에는 원문 링크와 게시일이 포함된다.
- 오래된 항목은 메인 리포트에서 제외된다.

### Step 2: 로컬 LLM 요약 및 다중 LLM 리뷰

목표:

- 수집된 원문 리포트를 LLM으로 요약하고, 다른 LLM이 리뷰한다.

포함 범위:

- OpenAI 요약
- Claude 리뷰
- 리뷰 결과: 통과, 수정 필요, 근거 부족
- 중요도 상위 항목만 2차 검증
- 최종 리포트에 검증 상태 표시

완료 기준:

- Markdown 리포트가 요약 리포트로 변환된다.
- 최종 요약 리포트에 검증 상태가 표시된다.
- 근거 부족 항목은 메인 섹션에서 분리된다.
- 원문 근거가 약한 항목은 확정 표현을 쓰지 않는다.

### Step 3: Notion 저장

목표:

- 리포트와 항목을 Notion에 저장한다.

포함 범위:

- Notion 데이터베이스 스키마
- 날짜별 리포트 페이지
- 항목별 카테고리, 중요도, 원문 링크 저장

완료 기준:

- 로컬에서 생성한 리포트가 Notion에 저장된다.
- 각 항목을 카테고리, 중요도, 출처, 검증 상태로 필터링할 수 있다.
- Notion 저장 실패가 리포트 파일 생성을 막지 않는다.

### Step 4: 음성용 스크립트 및 TTS

목표:

- 출근 중 들을 수 있는 브리핑을 생성한다.

포함 범위:

- 음성용 구어체 스크립트
- TTS 오디오 생성
- 오디오 파일 저장
- 이메일 또는 Notion에 링크 포함

완료 기준:

- 음성용 스크립트만 읽어도 핵심 흐름을 이해할 수 있다.
- TTS 실패 시 스크립트는 전달된다.
- 오디오 파일이 생성되면 Notion 또는 이메일에서 접근할 수 있다.

### Step 5: 로컬 이메일 발송

목표:

- 생성된 리포트, Notion 링크, 음성 브리핑 링크를 실제 이메일로 발송한다.

포함 범위:

- 이메일 템플릿
- Gmail SMTP, Gmail API, 또는 SendGrid 중 하나
- 발송 실패 로그
- 테스트 발송 모드

완료 기준:

- 사용자의 이메일로 리포트가 도착한다.
- 이메일에는 핵심 요약, Notion 링크, 음성 스크립트 또는 오디오 링크가 포함된다.
- 발송 실패 시 원인이 로그에 남는다.

### Step 6: GCP 배포

목표:

- 매일 자동 실행되는 운영 환경을 만든다.

포함 범위:

- Cloud Run
- Cloud Scheduler
- Cloud Scheduler timezone `Asia/Seoul`
- Secret Manager
- Cloud Logging
- Cloud Storage
- Firestore 또는 Cloud SQL

완료 기준:

- 매일 오전 7시 전후 자동 실행된다.
- GCP 콘솔 또는 gcloud 설정에서 Scheduler timezone이 `Asia/Seoul`로 확인된다.
- 실패 로그를 GCP에서 확인할 수 있다.
- API 키는 Secret Manager에서만 관리된다.

### Step 7: 소셜 및 YouTube 확장

목표:

- 빠른 소식 채널을 제한적으로 추가한다.

포함 범위:

- X/Twitter allow-list 계정
- Threads allow-list 계정
- YouTube 공식 채널 및 자막 기반 요약

완료 기준:

- 소셜 소식은 낮은 신뢰도 또는 확인 필요 상태로 표시된다.
- 공식 출처와 교차 확인된 경우만 확정 표현을 사용한다.

## 3. GCP를 처음부터 쓰지 않는 이유

GCP는 운영 자동화에 적합하지만, 제품이 아직 검증되지 않은 상태에서 바로 배포하면 다음 문제가 생긴다.

- API 키와 IAM 설정에 시간이 많이 든다.
- Cloud Run 로그와 로컬 디버깅을 오가야 한다.
- 수집 소스가 자주 실패할 때 원인 파악이 느리다.
- LLM 프롬프트와 리포트 형식을 빠르게 바꾸기 어렵다.

따라서 MVP는 로컬에서 먼저 만들고, 로컬에서 하루 리포트 생성이 안정화되면 GCP로 옮긴다.

## 4. 필요한 추가 문서

구현 전에 다음 문서가 있으면 개발 속도가 빨라진다.

- `docs/architecture.md`: 전체 시스템 구조
- `docs/source-registry.md`: 수집 소스 목록과 스키마
- `docs/data-schema.md`: Article, Report, Evidence, ReviewResult 스키마
- `docs/operations.md`: 실행 방법, 환경변수, 배포, 장애 대응
- `docs/doc-workflow.md`: 문서 작성, 검수, 로깅 루프
- `docs/harness-workflow.md`: 하네스 기반 코드 개발 방식
- `docs/token-workflow.md`: 토큰 사용을 줄이는 협업 방식
- `docs/logs/`: 작업 진행 로그
