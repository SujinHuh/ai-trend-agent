# Task 001 Implementation Sequence - LLM Wiki Local Store

## 1. 목적

이 문서는 `001_llm_wiki_local_store`를 구현하기 위한 세부 실행 순서다.

이 작업의 목표는 SQLite 기반 로컬 LLM Wiki 저장소를 만들어 이후 수집, 요약, Slack 발송, 웹 뉴스 화면이 모두 같은 데이터 모델을 기준으로 동작할 수 있게 하는 것이다.

## 2. 범위

포함:

- Node.js + TypeScript 프로젝트 초기화
- SQLite 연결
- schema 초기화
- `TrendItem` 저장
- `Digest` 저장
- `SourceEvidence` 저장
- canonical URL 기반 중복 방지
- 날짜별 digest 조회
- stable ID 생성
- 로컬 CLI
- 테스트와 검증 리포트

제외:

- 실제 외부 출처 수집
- LLM 호출
- Slack 발송
- Hermes `/cron`
- GCP 배포
- 웹 UI

## 3. 구현 순서

### 1. 기능 브랜치 만들기

작업 브랜치:

```text
feature/001-llm-wiki-local-store
```

목표:

- v2 Task 001부터 PR 흐름을 사용한다.
- `main`에는 완료된 작업만 병합한다.

### 2. 작업 문서 만들기

생성할 문서:

```text
docs/task/001_llm_wiki_local_store/
  requirements.md
  plan.md
  phase_status.md
  validation_report.md
```

목표:

- 구현 전 요구사항과 완료 기준을 고정한다.
- 단계별 진행 상태를 기록한다.
- 구현 후 검증 명령과 결과를 남긴다.

### 3. Node.js + TypeScript 프로젝트 초기화

생성 또는 설정할 항목:

- `package.json`
- `tsconfig.json`
- `src/`
- `test/` 또는 `tests/`
- npm scripts

추천 scripts:

```text
npm test
npm run typecheck
npm run db:init
npm run sample:seed
npm run digest:get -- --date=YYYY-MM-DD
```

### 4. SQLite 라이브러리 선택

추천:

```text
better-sqlite3
```

선택 이유:

- 로컬 CLI 저장소에 적합하다.
- 별도 서버가 필요 없다.
- 동기 API라 초기 MVP 구현이 단순하다.

### 5. DB schema 설계

초기 테이블:

- `trend_items`
- `digests`
- `source_evidence`
- `digest_trend_items`

필수 설계 기준:

- `trend_items.canonical_url` 또는 `canonical_hash`는 unique여야 한다.
- `digests.report_date`는 날짜별 조회가 쉬워야 한다.
- `digest_trend_items`는 Digest와 TrendItem 관계를 표현한다.
- `source_evidence`는 TrendItem의 근거 원문을 저장한다.

### 6. canonical URL 유틸 구현

규칙:

- URL scheme은 `https`를 우선한다.
- hostname은 lowercase로 변환한다.
- fragment는 제거한다.
- trailing slash는 제거한다.
- `utm_*`, `fbclid`, `gclid`, `ref`, `source` query parameter는 제거한다.
- 남은 query parameter는 key 기준으로 정렬한다.

목표:

- 같은 원문 URL은 query tracking 차이가 있어도 같은 canonical URL이 된다.

### 7. stable ID 생성 구현

규칙:

```text
canonicalHash = sha256(canonicalUrl)
```

권장 ID:

```text
trend_<canonicalHash prefix>
digest_<reportDate>
evidence_<hash>
```

목표:

- 같은 URL은 항상 같은 TrendItem ID를 가진다.

### 8. 저장소 함수 구현

필수 함수:

- DB 열기
- schema 초기화
- TrendItem 저장
- canonical URL 기준 중복 저장 방지
- Digest 저장
- Digest와 TrendItem 관계 저장
- SourceEvidence 저장
- 날짜별 Digest 조회
- TrendItem 단건 조회

목표:

- 이후 수집기와 Slack 발송기가 DB 내부 구현을 몰라도 사용할 수 있는 저장소 경계를 만든다.

### 9. 로컬 CLI 만들기

필수 명령:

```text
npm run db:init
npm run sample:seed
npm run digest:get -- --date=YYYY-MM-DD
```

목표:

- 외부 수집이나 Slack 없이도 저장소가 동작하는지 확인한다.

### 10. 테스트 작성

필수 테스트:

- canonical URL 정규화
- stable ID 재현성
- 같은 canonical URL 중복 저장 방지
- TrendItem 저장 후 조회
- Digest 저장 후 날짜별 조회
- Digest와 TrendItem 관계 조회

목표:

- 저장소의 핵심 불변조건을 자동 검증한다.

### 11. 검증 리포트 작성

기록할 항목:

- 실행한 명령
- 통과한 테스트
- 생성된 DB 경로
- 검증한 시나리오
- 남은 리스크

문서:

```text
docs/task/001_llm_wiki_local_store/validation_report.md
```

### 12. PR 만들기

PR에 포함할 내용:

- 구현 요약
- 검증 명령과 결과
- 범위에서 제외한 것
- 다음 작업

목표:

- Task 001을 독립적으로 리뷰하고 병합할 수 있게 한다.

## 4. 권장 서브 에이전트 분리

이 작업 하나만 놓고 보면 아래처럼 나눌 수 있다.

1. Task docs agent: `requirements.md`, `plan.md`, `validation_report.md` 작성
2. Schema agent: SQLite schema와 migration/init 구현
3. URL identity agent: canonical URL, hash, stable ID 구현
4. Repository agent: 저장/조회 함수 구현
5. CLI agent: 로컬 명령 구현
6. Test agent: 자동 테스트와 검증 리포트 점검

처음부터 6개를 모두 병렬로 돌릴 필요는 없다. schema와 URL identity가 먼저 정해져야 repository, CLI, test가 안정적으로 이어진다.

## 5. 진행 완료 처리 규칙

각 단계는 작업이 끝났다는 보고만으로 완료 처리하지 않는다.

진행 흐름:

1. 작업자가 해당 단계를 진행한다.
2. `phase_status.md`에서 해당 단계를 `Review`로 둔다.
3. Codex가 파일 변경, 명령 결과, 테스트 결과를 검수한다.
4. 검수 통과 시 `Done`으로 바꾼다.
5. 수정 필요 시 `Needs Fix`로 남기고 수정 항목을 적는다.
6. 의미 있는 진행, 검수, 수정은 `docs/logs/YYYY-MM-DD.md`에 기록한다.

이 규칙은 Task 001뿐 아니라 이후 task에도 동일하게 적용한다.
