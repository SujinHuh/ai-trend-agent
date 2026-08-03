# Step 05 - HTML renderer

- 요구사항: WEB-04~WEB-09, WEB-11~WEB-12
- 구현 파일: `src/web/render-news-page.ts`
- 테스트 파일: `tests/news-renderer.test.ts`
- 테스트: HTML escape, URL scheme, metadata, 인접 digest navigation/filter preservation/boundary, empty state, inline responsive CSS
- 완료 조건: 외부 입력이 markup/script가 되지 않고 핵심 정보가 HTML에 표시됨
- 검수: security/accessibility/public output 독립 검수
