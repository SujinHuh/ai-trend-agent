# Step 06 - HTTP routes

- 요구사항: WEB-02, WEB-06~WEB-10, WEB-12
- 구현 파일: `src/web/news-http.ts` (HTML에 CSS inline, 별도 static asset route 없음)
- 테스트 파일: `tests/news-http.test.ts`
- 테스트: `/news`, query, 400 invalid contract, missing date empty state, 404, `/healthz`, method handling, no-store header
- 완료 조건: read-only HTTP handler가 정확한 status/content-type/cache policy를 반환
- 검수: public route/security 독립 검수
