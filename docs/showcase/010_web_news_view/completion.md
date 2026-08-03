# 읽기 전용 웹 뉴스 화면 완료 보고서

## 현재 상태

Task 010 구현, 검증, GCE 배포와 공개 URL 확인을 완료했다. 병합 전 상태는 `Implemented - PR Review`다.

```text
News: http://34.22.67.160/ai-trend-agent/news
Health: http://34.22.67.160/ai-trend-agent/news/healthz
Report: http://34.22.67.160/ai-trend-agent/showcase/010_web_news_view/completion.html
```

## 구현 내용

- 저장된 Digest 날짜와 membership 기반의 읽기 전용 조회
- importance, confidence, digest position 기반 결정론적 정렬
- 날짜 이동과 `q`, `domain`, `category`, `source` 검색·필터 URL
- source registry 기반 domain/tag metadata와 명시적 fallback
- 안전한 HTML escape, `http(s)` 원문 링크, 빈 결과와 오류 화면
- JavaScript가 필요 없는 반응형 서버 렌더링 HTML
- 기존 private cron worker와 분리된 GCE read-only news process
- `/opt/ai-trend-news` 애플리케이션과 `/var/lib/ai-trend-news` SQLite snapshot
- SQLite online backup, integrity check, atomic publish와 systemd restart

## 운영·보안 경계

- 서비스는 전용 `ai-trend-news` nologin 계정으로 실행한다.
- SQLite는 read-only와 file-must-exist 모드로 연다.
- process는 `127.0.0.1:4174`에만 bind하고 nginx가 정확한 news/health 경로만 공개한다.
- 공개 process에는 Slack webhook이나 cron secret을 전달하지 않는다.
- `/cron`은 news service route가 아니며 직접 요청은 `404`다.
- 공개 DB는 writer DB의 online-backup snapshot이므로 writer cycle 뒤 installer를 다시 실행해 갱신한다.

## 독립 검수

- production `/var/lib` DB 경로가 일반 external-path guard에 막히던 HIGH finding을 news 전용 opt-in으로 수정
- `localhost` bind 해석 차이를 제거하고 `127.0.0.1`만 허용
- viewport font clamp를 고정 breakpoint 크기로 바꿔 확대·접근성 위험을 축소
- SQLite raw copy 대신 online backup, integrity check, 동일 filesystem atomic publish 적용
- 최종 전체 변경 재검수 결과 blocker 0

## 검증 결과

```text
npm run typecheck: passed
npm run build: passed
npm test: 27 files / 203 tests passed
git diff --check: passed
desktop/mobile browser scenarios: 3 passed
GCE news and health: HTTP 200, expected body confirmed
```

## 제외한 것

- 로그인과 권한 관리
- 브라우저 DB 쓰기, feedback 버튼과 profile 편집
- 무한 스크롤, 전문 검색 엔진, SPA framework
- writer DB의 자동 snapshot schedule

## 다음 단계

다음 후보는 backlog의 wiki lint command와 markdown-style wiki page generator다. Task 010 병합 후 별도 task로 범위를 확정한다.
