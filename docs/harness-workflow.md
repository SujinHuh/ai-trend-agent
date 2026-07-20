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

## 4. MVP 첫 작업 후보

첫 번째 하네스 작업:

```text
docs/task/001_local_collect_markdown_report/
```

목표:

- 로컬 명령어로 공식 출처를 수집하고 Markdown 리포트를 생성한다.

포함 범위:

- 프로젝트 초기 코드 구조
- Source Registry 초안
- Article 스키마
- RSS 또는 HTML 수집기
- 날짜 필터링
- 중복 제거
- Markdown 리포트 출력

제외 범위:

- GCP 배포
- 이메일 발송
- Notion 저장
- TTS
- X/Twitter, Threads, YouTube 수집

두 번째 하네스 작업:

```text
docs/task/002_local_llm_summary_review/
```

목표:

- 수집된 Markdown 원문 리포트를 LLM 요약 리포트로 변환하고, 다중 LLM 리뷰 결과를 붙인다.

세 번째 하네스 작업:

```text
docs/task/003_notion_report_archive/
```

목표:

- 요약 리포트와 항목을 Notion 데이터베이스에 저장한다.

네 번째 하네스 작업:

```text
docs/task/004_tts_briefing/
```

목표:

- 음성용 스크립트와 TTS 오디오를 생성한다.

다섯 번째 하네스 작업:

```text
docs/task/005_email_delivery/
```

목표:

- 이메일에 핵심 요약, Notion 링크, 음성 브리핑 링크를 포함해 발송한다.

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
