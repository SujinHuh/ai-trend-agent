# Step 03 - Store query contract

- 요구사항: WEB-01~WEB-05
- 구현 파일: `src/domain/types.ts`, `src/db/llm-wiki-store.ts`
- 테스트 파일: `tests/llm-wiki-store.test.ts`
- 테스트: 최신 날짜 목록, digest position, 같은 날짜 assessment, assessment 누락
- 완료 조건: 저장된 Digest membership을 손실 없이 읽는 typed API와 focused test 통과
- 검수: storage/public data contract 독립 검수

