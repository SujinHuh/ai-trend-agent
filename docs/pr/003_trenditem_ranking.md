# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 003: TrendItem 랭킹 및 LLM Wiki 합성`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- 저장된 `TrendItem`과 `SourceEvidence`를 기반으로 deterministic synthesis/ranking 흐름을 추가했습니다.
- `trend_assessments`, `trend_assessment_lineage` SQLite 테이블을 추가했습니다.
- `summary`, `whyItMatters`, `practicalImpact`, `trendCategory`, `actionLevel`, `confidence`, `importanceScore`, `confirmationStatus`, `sourceLineage`를 생성/저장합니다.
- `digest:candidates`, `wiki:query`, `wiki:index` CLI를 추가했습니다.
- Task 003 요구사항, 단계별 작업 문서, 검증 리포트, completion MD/HTML을 추가했습니다.

## ❓ 변경 이유

- LLM Wiki에 쌓인 공식 출처 기반 신호를 Slack digest 후보로 정렬하려면, 단순 저장소를 넘어 요약/중요도/신뢰도/검증 상태가 필요합니다.
- 이후 Task 004 Slack 발송, Task 005 cron, Task 006 배포가 사용할 공통 digest candidate contract를 먼저 고정하기 위한 작업입니다.
- social signal이나 Slack 전송은 이 PR 범위에서 제외해 Task 003을 ranking/synthesis 단위로 검수 가능하게 분리했습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
npm test
git diff --check
```

- typecheck 통과
- 전체 테스트 통과: 13 files / 61 tests
- Task 003 focused 테스트 통과: 5 files / 24 tests
- diff check 통과

수동 CLI 검증:

```text
npm run digest:candidates -- --date=2026-08-02 --limit=5
npm run wiki:query -- --date=2026-08-02 --limit=5
npm run wiki:index -- --date=2026-08-02 --out=docs/wiki/index.md
```

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

없음

## 💡 추가 설명

- Completion 문서:
  - `docs/showcase/003_trenditem_ranking/completion.md`
  - `docs/showcase/003_trenditem_ranking/completion.html`
- 공개 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/003_trenditem_ranking/completion.html
```

- 이 PR에는 LLM provider 호출, Slack 발송, social collector, full wiki lint command가 포함되지 않습니다.

## 👀 리뷰 요청

- ranking score와 confidence 계산이 공식 출처 우선 정책에 맞는지 확인해주세요.
- `needs_confirmation` 후보가 confirmed 후보와 명확히 구분되는지 확인해주세요.
- Task 004에서 Slack 메시지로 넘기기에 충분한 digest candidate contract인지 확인해주세요.
