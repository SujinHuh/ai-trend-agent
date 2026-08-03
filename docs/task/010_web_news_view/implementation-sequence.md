# Task 010 구현 순서 - 웹 뉴스 화면

1. 최신 `main`과 Task 009 merge를 확인하고 `feature/010-web-news-view`를 만든다.
2. 요구사항, 계획, 구현 순서, 단계 상태와 step 문서를 작성한다.
3. news view domain contract와 Digest membership 조회 API를 테스트와 함께 구현한다.
4. Source Registry metadata index와 news view model 검색/필터/정렬을 테스트와 함께 구현한다.
5. 접근 가능한 서버 렌더링 HTML과 안전한 escape/link 처리를 테스트와 함께 구현한다.
6. inline CSS 기반 `/news`, `/healthz` 응답과 HTTP query validation을 통합 테스트와 함께 구현한다.
7. 별도 `news:serve` CLI와 GCE systemd/nginx 실행 경로를 구현하고 기존 worker 회귀 테스트를 추가한다.
8. 1440x1000/390x844 화면, 긴 콘텐츠, 빈/오류 상태를 브라우저와 overflow 검사로 검증한다.
9. focused test, typecheck, build, full test, diff check를 실행한다.
10. 위험 단계와 전체 변경을 독립 서브에이전트가 검수하고 지적을 반영한다.
11. validation report와 completion Markdown/HTML을 작성한다.
12. GCE news/showcase 경로를 배포하고 외부 HTTP 응답, persistent DB 경로, 화면을 확인한다.
13. 배포 변경을 포함한 최종 재검수/재검증 후 PR template 기반 한글 PR 문서, push, PR handoff를 완료한다.

각 단계는 [v2 Task Harness](../../v2-task-harness.md)의 numbered step loop를 따른다.
