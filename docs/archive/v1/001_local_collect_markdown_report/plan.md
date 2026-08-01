# Task 001: Local Collect Markdown Report Plan

## 1. 구현 목표

로컬에서 공식 출처를 수집하고, deterministic 검증과 필터링을 거쳐 Markdown 리포트를 생성한다.

## 2. 구현 순서

1. Node.js + TypeScript 프로젝트 스캐폴딩
2. `config/sources.json` 생성
3. Source Registry 로더 구현
4. RSS/Atom/GitHub Releases 파서 구현
5. 정적 HTML list parser 구현
6. 로컬 raw cache 구현
7. RawArticle -> Article 정규화 구현
8. canonical URL 생성과 dedupe 구현
9. KST 날짜 윈도우 계산 구현
10. partial failure 처리 구현
11. Markdown formatter 구현
12. CLI 옵션 처리 구현
13. 로컬 실행 검증

## 3. 구현 우선순위

우선순위 1:

- Source Registry 로딩
- RSS/Atom/GitHub Releases 수집
- KST 날짜 윈도우
- Markdown 출력

우선순위 2:

- HTML list parser
- raw cache
- canonical URL dedupe
- partial failure

우선순위 3:

- selector 조정
- 테스트 케이스 보강
- validation report 작성

## 4. 검증 명령 후보

```bash
npm run generate -- --date=2026-07-20
npm run generate -- --date=2026-07-20 --force-refresh
npm run generate -- --source=google-blog-feed --date=2026-07-20
npm test
```

## 5. 완료 조건

- `reports/YYYY-MM-DD/markdown-report.md`가 생성된다.
- 리포트에 Window, Summary, Included Articles, Needs Review, Excluded, Source Failures 섹션이 있다.
- KST 기준 전날 07:00 이상, 당일 06:50 미만 윈도우가 적용된다.
- source 하나가 실패해도 나머지 source 결과로 리포트가 생성된다.
- 모든 source 실패 시 실패 exit code를 반환한다.
- LLM, Notion, TTS, Email, GCP, 소셜/영상 수집이 포함되지 않는다.

