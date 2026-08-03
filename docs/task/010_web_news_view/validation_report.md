# Task 010 검증 보고서 - 웹 뉴스 화면

상태: `Implemented - PR Review`

## 단계별 검증

### Step 2 - 문서와 범위

- 독립 검수: HIGH 2, MEDIUM 7, LOW 2
- HIGH 수정: 공개 news를 private Cloud Run worker와 분리하고 GCE persistent disk/read-only DB/nginx 경로로 확정했다.
- MEDIUM/LOW 수정: Rocket Brief 재확인, inline CSS 범위, query/date/null 정렬 계약, 정확한 viewport, 배포 후 재검수, 신규 `/healthz` 계약을 명시했다.
- 원본 reference URL은 2026-08-03 확인 시 외부 도구에서 열리지 않아 Step 08에서 다시 확인한다.

### Step 3 - Store query

- `npm test -- --run tests/llm-wiki-store.test.ts`: 1 file / 16 tests 통과
- `npm run typecheck`: 통과
- 독립 검수: 구현 blocker 없음, membership 밖 item과 다른 날짜 assessment 제외 테스트 보강 요청 1건
- 수정 후 `tests/llm-wiki-store.test.ts`: 17 tests 통과, 재검수 blocker 0

### Step 4 - View model

- 독립 검수: confidence/position tie-break, 전체 검색 필드, oversize 입력 테스트 누락 지적
- 수정: null-last 정렬, summary/why/impact/source/stable ID/tag 검색, 121자와 빈 입력 case 추가
- `tests/news-view-model.test.ts`: 12 tests 통과, 재검수 blocker 0

### Step 5 - HTML renderer

- 독립 검수: GCP prefix 링크, 외부 active option, 긴 문자열 overflow, list semantics 지적
- 수정: injectable `basePath`, selected option 보존, `overflow-wrap:anywhere`, `role=list`
- `tests/news-renderer.test.ts`: 6 tests 통과, escape/http(s) URL 정책 포함, 재검수 blocker 0

### Step 6 - HTTP

- 독립 검수: typed 400 오류, store failure 500/503 비노출, 조합 query wiring 지적
- 수정: `NewsViewQueryError`, generic 500, minimal 503, CSP/no-store/security header와 HEAD 검증
- `tests/news-http.test.ts`: 11 tests 통과, 재검수 blocker 0

### Step 7 - CLI와 GCE 배포

- 독립 검수 1차: 로그인 사용자 홈 접근, DB 권한, `port=0` cron 회귀, template 치환 지적
- 수정: `ai-trend-news` nologin user/group, `/opt` root-owned app, `/var/lib` DB, `ProtectHome=true`, positive port 유지
- 독립 검수 2차: WAL raw copy와 실행 중 DB in-place overwrite 지적
- 수정: SQLite online backup + `integrity_check`, 같은 filesystem atomic rename, service restart
- `tests/gce-news-snapshot.test.ts` + deployment tests: 9 tests 통과
- `systemd-analyze verify`: unit 자체 오류 없음. host의 기존 `snapd.service` unknown key warning만 존재
- `bash -n scripts/gce/install-news-service.sh`: 통과
- 최종 배포 검수 blocker 0

### Step 8 - Browser

- Chromium/Playwright `1440x1000`: `/tmp/task010-browser/desktop.png`
- Chromium/Playwright `390x844`: `/tmp/task010-browser/mobile.png`
- 두 viewport의 `scrollWidth <= clientWidth`, 검색 form과 URL, 빈 상태, invalid date `400`: 3 tests 통과
- 시각 확인: desktop/mobile 모두 nonblank, control/text overlap 및 수평 overflow 없음
- Rocket Brief reference: 외부 도구에서 URL을 열 수 없어 접근 실패를 기록하고 v2 문서의 날짜/Top Signals/원문 정보 계층을 기준으로 검증

## 전체 검증

```text
npm run typecheck   pass
npm run build       pass
npm test            pass
git diff --check    pass
```

- Vitest collection: 27 files / 203 tests
- CLI 기존 suite는 sandbox child-process 병렬 실행에서 간헐적 빈 stdout이 한 차례 발생했으나 단독 22-test run 통과 후 Task 010 CLI 3 tests를 추가 통과했다.
- non-CLI suite와 누락 가능 파일을 분리 재실행해 모두 통과했다.

## 독립 검수

- Step 2~7 risk-bearing 변경은 각 단계에서 독립 검수, 수정, 재검수를 완료했다.
- final whole-task review 1차: HIGH 1, LOW 2.
- HIGH 수정: production `/var/lib/ai-trend-news` DB가 일반 external-path guard에 막히던 문제를 news process에만 적용되는 `AI_TREND_NEWS_ALLOW_EXTERNAL_DB_PATH=true`로 분리했다.
- LOW 수정: host 입력에서 `localhost`를 제거하고 `127.0.0.1`만 허용했으며, viewport 기반 font-size clamp를 고정 breakpoint 크기로 변경했다.
- 수정 후 startup/deploy/renderer focused 4 files / 38 tests 통과, 전체 변경 재검수 blocker 0.

## GCE 배포 확인

- `ai-trend-news.service`: enabled, active (running), 전용 `ai-trend-news` nologin user/group.
- listener: `127.0.0.1:4174`만 사용하고 public interface에 직접 bind하지 않음.
- app: `root:root 0755 /opt/ai-trend-news`.
- data: `root:ai-trend-news 0750 /var/lib/ai-trend-news`, DB `0640`; service user는 read 가능, write 불가.
- nginx: `/etc/nginx/snippets/ai-trend-news.conf`를 기존 server block에 include, `nginx -t`와 reload 통과.
- `http://34.22.67.160/ai-trend-agent/news`: HTTP 200, AI Trend Agent/LLM Wiki digest 본문 확인.
- `http://34.22.67.160/ai-trend-agent/news/healthz`: HTTP 200, `{"ok":true,"service":"ai-trend-news"}` 확인.
- `POST /ai-trend-agent/cron`, `POST /ai-trend-agent/news/cron`: 모두 HTTP 404.
- completion HTML은 local/public HTTP 200과 Task 010/203 passed/0 blockers marker를 확인했다.

## 허용한 위험

- 공개 DB는 online backup snapshot이며 writer cycle 완료 후 installer를 다시 실행해야 갱신된다.
- 기존 동명 `ai-trend-news` 계정이 있을 때 nologin 속성 검사는 비차단 hardening 후속이다.
- HTTP 공개 IP는 기존 GCE/nginx 운영 계약을 따르며 TLS 전환은 Task 010 범위 밖이다.
