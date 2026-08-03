# Task 010 요구사항 - 웹 뉴스 화면

## 목표

LLM Wiki에 저장된 Digest와 TrendItem을 읽기 전용 웹 화면에서 날짜별로 탐색한다.

## 포함 범위

- 날짜별 news view와 이전/다음 digest 이동
- 중요도 순 Top Signals 목록
- 원문 링크와 LLM Wiki stable ID
- source, source tag, domain, trend category, confidence, importance 표시
- `date`, `q`, `domain`, `category`, `source` query parameter 기반 검색/필터 URL
- 데이터가 없거나 필터 결과가 없는 상태
- 기존 private Cloud Run worker와 분리된 공개 read-only news service의 `GET /news` 경로
- 읽기 전용 SQLite 조회와 서버 렌더링 HTML

## 제외 범위

- 사용자 로그인과 권한 관리
- 브라우저에서 DB를 변경하는 기능
- feedback 버튼과 개인화 프로필 편집
- 무한 스크롤, 페이지네이션, 전문 검색 엔진
- 별도 SPA framework와 frontend build pipeline
- 모바일 앱, Notion, 이메일, TTS

## 기능 요구사항

| ID | 요구사항 |
| --- | --- |
| WEB-01 | digest가 저장된 날짜를 최신순으로 조회하고 기본 화면은 최신 날짜를 선택한다. |
| WEB-02 | 유효한 `date=YYYY-MM-DD`를 지정하면 해당 날짜의 Digest와 TrendItem만 표시한다. |
| WEB-03 | digest 항목은 importance 내림차순, confidence 내림차순, digest position 오름차순으로 표시하고 미평가 null은 마지막에 둔다. |
| WEB-04 | 각 항목은 title, summary, why it matters, practical impact, 원문 링크, stable ID를 표시한다. |
| WEB-05 | 각 항목은 source, source tag, domain, trend category, confirmation, confidence, importance를 표시한다. |
| WEB-06 | `q`는 title, summary, why it matters, practical impact, source, tag, stable ID를 대소문자 구분 없이 검색한다. |
| WEB-07 | `domain`, `category`, `source` 필터는 query parameter로 보존되고 조합할 수 있다. |
| WEB-08 | 잘못된 날짜/domain/category, 알 수 있는 key의 중복, 알 수 없는 query key, 120자를 넘는 `q`/`source`는 `400`이다. 빈 값은 미지정, registry에 없는 유효한 source 문자열은 빈 결과로 처리한다. 없는 날짜는 빈 화면과 `200`을 반환한다. |
| WEB-09 | HTML의 DB 문자열과 URL은 escape하고 원문 링크는 `http` 또는 `https`만 허용한다. |
| WEB-10 | news service는 DB를 열 수 있을 때 `GET /healthz`에 최소 JSON을 반환하고, 기존 private Cloud Run `POST /cron` 코드와 배포 계약을 변경하지 않는다. |
| WEB-11 | 화면은 모바일과 데스크톱에서 겹침 없이 사용할 수 있어야 한다. |
| WEB-12 | 뉴스 경로는 조회 전용이며 secret, webhook, cron run 내부값을 노출하지 않는다. |

## 데이터 매핑

- Digest 날짜와 membership: SQLite `digests`, `digest_trend_items`
- 본문과 stable ID: `trend_items`, 같은 report date의 `trend_assessments`
- source/domain/tag: 현재 Source Registry에서 `TrendItem.sourceName`으로 매핑
- source registry에서 찾지 못한 source: `domain=ai`, tag 없음으로 안전하게 표시
- assessment가 없는 digest item: 기본 설명과 `confidence/importance` 미평가 상태로 표시

## 배포와 저장소 경계

- 기존 `ai-trend-worker` Cloud Run service는 IAM/OIDC 비공개 상태와 ephemeral worker DB 계약을 유지한다.
- 공개 news service는 `34.22.67.160` GCE VM에서 별도 process/port와 read-only DB connection으로 실행한다.
- news DB는 container filesystem이 아니라 GCE persistent disk의 명시적 `LLM_WIKI_DB_PATH`를 사용한다.
- nginx는 `/ai-trend-agent/news`만 news service의 `/news`로 reverse proxy한다. `/cron`은 공개 proxy하지 않는다.
- GCE 배포 전에는 실제 DB 파일의 소유권, backup, 갱신 주체를 확인하고 validation report에 기록한다.

## 날짜 이동 계약

- 이전/다음은 `availableDates`에서 바로 인접한 저장 digest로 이동하므로 날짜 공백을 건너뛴다.
- 최신 날짜에는 다음 링크, 최초 날짜에는 이전 링크를 표시하지 않는다.
- 날짜 이동 시 `q`, `domain`, `category`, `source` 필터는 유지한다.

## UI reference

- 원본 v2 문서가 지정한 Rocket Brief news 화면을 Step 08에서 다시 확인한다.
- 채택 대상은 날짜 중심 탐색, 빠르게 훑는 Top Signals 정보 계층, 원문 이동성이다.
- 프로젝트 고유 stable ID, 신뢰도, 중요도, domain/tag metadata는 이 서비스의 요구사항을 우선한다.
- reference가 접근 불가능하면 확인 시각과 실패를 기록하고 요구사항 기반 검증을 계속한다.

## 완료 기준

- store 테스트가 날짜 목록과 digest membership 기반 조회를 검증한다.
- view model 테스트가 정렬, 검색, 조합 필터, registry metadata fallback을 검증한다.
- renderer 테스트가 escape, 안전한 외부 링크, 빈 상태, 반응형 landmark를 검증한다.
- HTTP 통합 테스트가 `/news`, query URL, `400`, `404`, `/healthz`, generic `500`/readiness `503`을 검증한다.
- CLI 통합 테스트가 `news:serve` 또는 통합 worker server wiring을 검증한다.
- `typecheck`, build, 전체 테스트, diff check를 통과한다.
- 독립 서브에이전트 검수와 수정 후 재검증을 기록한다.
- 완료 Markdown/HTML과 GCP 공개 확인 URL을 만든다.
