# LLM Wiki Hotfix Gap Analysis

## 결론

Karpathy LLM Wiki 원문을 참고한 보강은 `feature/002-ai-official-source-ingestion`에 hotfix로 추가하는 것이 맞다. 다만 이 브랜치에서 큰 기능 구현까지 넣으면 Task 002의 범위가 흔들린다.

권장 분리:

1. Task 002 hotfix: 문서, source trust policy, trusted AI signal watch-list, Task 003 handoff 기준 보강
2. Task 003: ranking, summary, `whyItMatters`, confidence, action level, source lineage 구현
3. Task 007: X/Threads/Reddit/HN allow-list collector 구현
4. Later lint task: wiki health-check, stale claim, contradiction, orphan tag 점검

## 현재 충분한 것

| Area | Current state |
| --- | --- |
| Local store | SQLite 기반 `TrendItem`, `Digest`, `SourceEvidence`가 있음 |
| Raw source cache | `.cache/sources/YYYY-MM-DD/{sourceId}.json` 정책과 fetch/cache 구현이 있음 |
| Source registry | 공식 source와 disabled backlog를 config로 관리함 |
| Partial failure | source 하나가 실패해도 전체 ingestion은 계속됨 |
| Deduplication | canonical URL과 stable ID를 재사용함 |
| Official-source MVP | Anthropic, Mistral RSS, Hugging Face RSS, GitHub Releases로 live validation 통과 |
| Documentation | task별 requirements, plan, implementation sequence, phase status, validation report가 있음 |

## 부족한 것

| Gap | Why it matters | Where to solve |
| --- | --- | --- |
| Markdown-style wiki synthesis layer 없음 | Karpathy식 LLM Wiki는 raw source 위에 누적되는 요약/개념/연결 페이지가 핵심이다. 현재는 DB item 저장까지만 있다. | Task 003 |
| `summary`, `whyItMatters`, `practicalImpact` 저장 필드 없음 | 솔로 개발자에게 "왜 중요한지"를 보여주려면 단순 title/excerpt 이상이 필요하다. | Task 003 |
| `actionLevel` 없음 | 사용자가 빠르게 움직이려면 `do_now`, `do_next`, `watch_later`, `needs_confirmation` 구분이 필요하다. | Task 003 |
| source lineage가 약함 | 공식 출처와 개인/소셜 신호가 어떻게 연결됐는지 추적해야 confidence를 방어할 수 있다. | Task 003 |
| trusted individual allow-list가 코드 config로 없음 | Karpathy, 유명 연구자, Kimi/DeepSeek/Qwen 관련 신호를 체계적으로 다루려면 별도 registry가 필요하다. | Task 007 |
| social signal collector 없음 | X/Threads/Reddit/HN은 빠르지만 API, 약관, rate limit, 신뢰도 처리가 필요하다. | Task 007 |
| lint command 없음 | stale claim, contradiction, orphan tag, broken source를 정기적으로 잡아야 wiki가 썩지 않는다. | Later lint task |
| index/query entrypoint 없음 | Karpathy 원문은 `index.md`와 `log.md`가 LLM의 탐색 시작점이다. 현재 docs index는 있지만 DB wiki index는 없다. | Task 003 or web task |
| contradiction/staleness 정책 없음 | 새로운 모델 발표가 기존 결론을 뒤집을 수 있다. | Task 003 |
| 공식 출처 미확인 signal 승격 방지 장치 없음 | 빠른 social signal이 사실처럼 digest에 섞이면 신뢰도가 떨어진다. | Task 003 + Task 007 |

## 지금 브랜치 Hotfix로 넣을 것

이미 들어갔거나 넣어야 하는 문서 보강:

1. Karpathy LLM Wiki 원문을 프로젝트 운영 원칙으로 연결한다.
2. raw source, wiki synthesis, schema, ingest/query/lint 개념을 현재 DB 구조에 매핑한다.
3. influential AI people / X 신호는 `trusted_individual` 또는 `community`로 분리한다.
4. social signal은 기본적으로 `needs_confirmation`으로 둔다.
5. Task 003에서 추가해야 할 필드와 ranking 기준을 명확히 남긴다.
6. Task 007에서 collector로 구현할 후보와 검증 기준을 분리한다.

이 hotfix는 Task 002 PR에 들어가도 괜찮다. 이유는 Task 002가 source ingestion boundary를 만드는 PR이고, source trust policy와 Task 003 handoff는 그 boundary의 일부이기 때문이다.

## 지금 브랜치에 넣으면 안 되는 것

아래는 Task 002 hotfix가 아니라 별도 구현 task로 빼야 한다.

1. X API collector 구현
2. Threads collector 구현
3. Reddit/HN keyword collector 구현
4. LLM summary 생성
5. ranking score 계산
6. Slack digest 문구 생성
7. markdown wiki page generator
8. DB migration으로 large schema 확장

이것들을 지금 넣으면 PR #1이 "source ingestion" PR이 아니라 ranking/social/wiki-generation PR이 되어 review 범위가 커진다.

## Task 003에 꼭 넣어야 할 것

1. `summary`
2. `whyItMatters`
3. `practicalImpact`
4. `trendCategory`
5. `actionLevel`
6. `confidence`
7. `importanceScore`
8. `sourceLineage`
9. `confirmationStatus`
10. `contradictionNotes`
11. `stalenessPolicy`
12. daily digest 후보 생성 CLI

## Task 007에 꼭 넣어야 할 것

1. trusted individual registry
2. official org social registry
3. community source registry
4. API/terms/rate-limit validation
5. manual export fallback
6. social item normalization
7. official-source cross-confirmation
8. noisy account pruning policy

## Recommended Next Action

Task 002에는 이 문서와 reference/watch-list 문서를 hotfix로 커밋한다. 그 다음 Task 003을 시작할 때 이 문서를 기준으로 ranking/synthesis schema를 설계한다.
