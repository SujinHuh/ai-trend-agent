# LLM Wiki Karpathy Reference

## 원문 참고

- Andrej Karpathy LLM Wiki gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Karpathy GitHub profile: https://github.com/karpathy
- Karpathy X profile: https://x.com/karpathy

## 적용 판단

Karpathy의 LLM Wiki 원문은 현재 프로젝트 방향과 잘 맞는다. 다만 이 프로젝트는 Obsidian markdown vault가 아니라 SQLite 기반 ingestion/digest 시스템이므로, 원문을 그대로 복사하지 않고 운영 원칙으로 흡수한다.

핵심 적용점:

1. raw source는 수정하지 않는 원문 증거로 유지한다.
2. LLM Wiki는 매번 RAG처럼 재검색하는 공간이 아니라, 누적되는 synthesis layer로 유지한다.
3. schema 또는 운영 문서가 에이전트 행동 규칙이 되어야 한다.
4. ingest, query, lint를 별도 운영 모드로 구분한다.
5. index와 log는 사람이 보는 문서이면서 에이전트가 다음 작업을 찾는 entrypoint가 되어야 한다.

## 현재 프로젝트 매핑

| Karpathy 원문 개념 | 현재 프로젝트 매핑 | 보강 방향 |
| --- | --- | --- |
| Raw sources | `.cache/sources/YYYY-MM-DD/{sourceId}.json`, `SourceEvidence` | 원문 URL, fetchedAt, parser 결과, 실패 원인을 보존한다. |
| Wiki | `TrendItem`, `Digest`, 향후 markdown/wiki view | Task 003부터 요약과 `whyItMatters`를 누적 산출물로 저장한다. |
| Schema | `docs/source-registry.md`, task requirements, implementation sequence | 에이전트가 source trust, ranking, lint 기준을 따르도록 문서화한다. |
| Ingest | Task 002 | source 수집과 정규화만 담당한다. |
| Query | Task 003 이후 | digest 질문, 비교표, action item을 다시 Wiki에 저장할 수 있게 한다. |
| Lint | Task 003 이후 별도 점검 | stale claim, broken source, orphan tag, contradiction, missing source를 주기 점검한다. |
| Index | `docs/README-docs.md`, 향후 wiki index | 사람이 가장 먼저 볼 인덱스와 에이전트 entrypoint를 유지한다. |
| Log | `docs/logs/YYYY-MM-DD.md` | append-only 작업 기록을 계속 유지한다. |

## Task 003에 반영할 운영 원칙

Task 003은 단순히 최신 글을 요약하는 단계가 아니다. 수집된 source item을 LLM Wiki에 누적되는 지식 단위로 바꾸는 단계다.

Task 003에서 추가할 필드 또는 산출물:

1. `summary`: 원문의 핵심 요약
2. `whyItMatters`: 솔로 개발자 관점의 의미
3. `practicalImpact`: 지금 코드, 도구, 학습, 제품 판단에 주는 영향
4. `trendCategory`: model, product, coding-agent, open-source, benchmark, safety, infra 등
5. `actionLevel`: `do_now`, `do_next`, `watch_later`, `needs_confirmation`
6. `confidence`: 공식 출처 여부와 교차 확인 여부
7. `sourceLineage`: 어떤 raw source와 어떤 trusted signal에서 왔는지
8. `contradictionNotes`: 기존 item이나 digest와 충돌하는 내용
9. `stalenessPolicy`: 며칠 뒤 재확인할지
10. `wikiLinks`: 관련 vendor, model, tool, benchmark concept link

## Lint Checklist

주기적으로 아래를 점검한다.

1. broken source URL
2. failed source가 반복되는지
3. 같은 모델/제품이 여러 이름으로 중복 저장됐는지
4. 최신 release가 과거 digest의 결론을 뒤집는지
5. `needs_confirmation` item이 공식 출처로 확인됐는지
6. 중요한 vendor, model, benchmark, tool tag에 연결된 item이 없는지
7. enabled source가 너무 좁아 빠른 트렌드를 놓치고 있지 않은지
8. trusted individual source가 사실처럼 digest에 섞이지 않았는지

## 운영 원칙

- 공식 출처는 `included` 후보가 될 수 있다.
- trusted individual과 community signal은 빠른 감지용이며 기본값은 `needs_confirmation`이다.
- X/Threads/Reddit 신호는 공식 출처, GitHub release, 논문, vendor blog 중 하나로 교차 확인되기 전까지 사실로 쓰지 않는다.
- 사용자가 솔로 개발자라는 점을 고려해 답변과 digest는 항상 "지금 할 일", "다음에 볼 일", "관찰만 할 일"을 구분한다.
