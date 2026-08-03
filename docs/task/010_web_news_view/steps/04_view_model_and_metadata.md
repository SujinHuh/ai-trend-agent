# Step 04 - View model and metadata

- 요구사항: WEB-03, WEB-05~WEB-08
- 구현 파일: `src/web/news-view-model.ts`
- 테스트 파일: `tests/news-view-model.test.ts`
- 테스트: null-last deterministic sort, text search, combined filters, registry fallback, invalid/duplicate/unknown/oversize input
- 완료 조건: 순수 함수로 URL query와 source metadata를 검증하고 결과/option을 생성
- 검수: filtering/public output contract 독립 검수
