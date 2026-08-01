# Harness Workflow

## 1. 목적

코드 개발은 하네스 기반으로 진행한다.

하네스는 기능 구현을 작은 작업 단위로 쪼개고, 각 작업마다 요구사항, 계획, 구현 노트, 검증 결과를 남기는 방식으로 사용한다.

## 2. 기본 원칙

- 기능을 바로 크게 구현하지 않고 작업 단위로 나눈다.
- 각 작업은 명확한 완료 기준을 가진다.
- 구현 전 요구사항과 계획을 문서화한다.
- 구현 후 검증 결과를 남긴다.
- 작업 로그는 `docs/logs`에 한 줄로 남긴다.

## 3. 권장 작업 구조

작업별 문서는 다음 구조를 따른다.

```text
docs/task/NNN_task_name/
  issue.md
  requirements.md
  plan.md
  phase_status.md
  implementation_notes.md
  validation_report.md
```

로컬 MVP에서는 문서가 과해지지 않도록 최소 필수 문서를 둔다.

필수:

- `requirements.md`
- `plan.md`
- `validation_report.md`

필요 시 작성:

- `issue.md`
- `phase_status.md`
- `implementation_notes.md`

각 작업은 로컬 실행 명령, 성공 기준, 검증 결과를 반드시 남긴다.

## 4. v2 작업 순서

첫 번째 하네스 작업:

```text
docs/task/001_llm_wiki_local_store/
```

목표:

- SQLite 기반 로컬 LLM Wiki 저장소를 만든다.

포함 범위:

- Node.js + TypeScript 프로젝트 초기화
- SQLite schema
- `TrendItem`, `Digest`, `SourceEvidence` 저장
- canonical URL 중복 제거
- stable ID 생성
- 로컬 CLI
- 테스트와 검증 리포트

제외 범위:

- 실제 외부 출처 수집
- LLM 호출
- Slack 발송
- Hermes `/cron`
- GCP 배포
- 웹 뉴스 화면

두 번째 하네스 작업:

```text
docs/task/002_ai_official_source_ingestion/
```

목표:

- AI 공식 출처에서 최신 항목을 가져와 LLM Wiki에 저장한다.

세 번째 하네스 작업:

```text
docs/task/003_trenditem_ranking/
```

목표:

- 수집된 항목을 daily digest 후보로 변환하고 중요도를 매긴다.

네 번째 하네스 작업:

```text
docs/task/004_slack_manual_delivery/
```

목표:

- 저장된 Digest를 Slack Incoming Webhook으로 수동 발송한다.

다섯 번째 하네스 작업:

```text
docs/task/005_hermes_cron/
```

목표:

- Hermes `/cron`이 매일 `07:00 KST`에 digest 작업을 실행하게 한다.

전체 1-10번 순서는 [Implementation Sequence v2](implementation-sequence-v2.md)를 따른다.

## 5. 개발 루프

1. 작업 문서 생성
2. 요구사항 확인
3. 구현 계획 작성
4. 코드 구현
5. 로컬 실행
6. 테스트 또는 검증
7. 구현 노트 작성
8. 검증 리포트 작성
9. 작업 로그 기록

## 6. 오류 처리 루프

하네스 작업 중 오류가 발생하면 다음 정보를 작업 문서에 남긴다.

- 실패한 명령
- 실패 증상
- 원인 후보
- 수정 내용
- 재검증 명령
- 최종 결과

오류가 요구사항, 아키텍처, 보안, 비용, 운영, 주요 기능에 영향을 주면 서브 에이전트 검수를 실행한다.

단순 오타나 명확한 설정 누락처럼 영향이 작은 오류는 로컬 재검증과 한 줄 로그로 처리한다.
