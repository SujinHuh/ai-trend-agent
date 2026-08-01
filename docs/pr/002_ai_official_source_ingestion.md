# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `[Draft] AI 공식 출처 수집 파이프라인 구축`

- [x] 신규 기능 추가
- [x] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- Task 002 `AI 공식 출처 수집` 문서, 단계별 하위 계획서, 진행 상태표, 검증 리포트를 추가했습니다.
- Source Registry 설정 파일과 로딩/검증 로직을 추가했습니다.
- Anthropic, Mistral RSS, Hugging Face RSS, OpenAI Python GitHub Releases를 enabled MVP source로 설정했습니다.
- OpenAI News와 Google Blog Feed는 live fetch/feed 검증 결과에 따라 disabled backlog로 유지했습니다.
- DeepMind, Meta AI, Kimi, DeepSeek, Qwen 등은 disabled expansion source로 기록했습니다.
- fetch/cache, RSS/Atom parser, GitHub Releases parser, HTML list parser를 추가했습니다.
- KST report window 기반 정규화와 검증, LLM Wiki `TrendItem`/`SourceEvidence` 저장 통합을 추가했습니다.
- `sources:validate`, `ingest:run` CLI를 추가했습니다.
- 서브 에이전트 리뷰에서 발견된 HTML selector, `maxItemsPerFetch`, non-2xx cache 처리 문제를 수정했습니다.
- live ingestion 안정화를 위해 Anthropic 날짜 추출, RSS non-feed 실패 처리, valid empty feed 처리, enabled source 구성을 보완했습니다.
- Karpathy LLM Wiki 원문 참고, trusted AI signal watch-list, hotfix gap analysis를 추가해 Task 003 handoff 기준을 보강했습니다.
- 아직 미구현 항목을 1-20번으로 재번호화하고 Task 003/Task 007/later lint로 분리했습니다.
- X/Twitter/Threads/Reddit/HN 수집 방식을 social signal collection plan에 명확히 분리했습니다.

## ❓ 변경 이유

- v2 Task 001에서 만든 LLM Wiki 로컬 저장소에 실제 AI 공식 출처 데이터를 저장할 수 있는 수집 경계를 만들기 위해서입니다.
- 이후 Task 003 랭킹/요약, Slack 발송, Hermes `/cron`, 웹 뉴스 화면이 모두 같은 source ingestion 결과를 기준으로 동작해야 합니다.
- 솔로 개발자가 빠르게 변하는 AI 트렌드를 놓치지 않도록 공식 출처와 확장 후보를 분리해 관리할 필요가 있습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
```

- Passed.

```text
npm test
```

- Passed.
- 11 test files passed.
- 49 tests passed.

```text
npm run sources:validate
```

- Passed.
- 13 configured sources.
- 4 enabled MVP sources.

수동 cached ingestion 검증:

```text
npm run ingest:run -- \
  --config=/tmp/ai-trend-agent-task002-cli-AFvjjk/sources.json \
  --db=/tmp/ai-trend-agent-task002-cli-AFvjjk/wiki.sqlite \
  --cache-root=/tmp/ai-trend-agent-task002-cli-AFvjjk/cache \
  --date=2026-08-01
```

- Passed.
- `insertedOrUpdatedCount`: 1
- `failedSourceCount`: 0
- `cacheHit`: true

수동 live ingestion 검증:

```text
npm run ingest:run -- --db=/tmp/ai-trend-agent-task002-live.sqlite --cache-root=/tmp/ai-trend-agent-task002-live-cache --date=2026-08-01 --force-refresh
```

- Passed.
- `failedSourceCount`: 0
- `insertedOrUpdatedCount`: 1

```text
npm run ingest:run -- --db=/tmp/ai-trend-agent-task002-live-0731.sqlite --cache-root=/tmp/ai-trend-agent-task002-live-cache-0731 --date=2026-07-31 --force-refresh
```

- Passed.
- `failedSourceCount`: 0
- `insertedOrUpdatedCount`: 2

```text
npm run ingest:run -- --db=/tmp/ai-trend-agent-task002-live-0730.sqlite --cache-root=/tmp/ai-trend-agent-task002-live-cache-0730 --date=2026-07-30 --force-refresh
```

- Passed.
- `failedSourceCount`: 0
- `insertedOrUpdatedCount`: 1

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

## 💡 추가 설명

- OpenAI News는 현재 서버 환경에서 HTTP 403이 재현되어 disabled 상태입니다.
- Google Blog Feed는 설정 URL이 RSS가 아닌 HTML을 반환해 disabled 상태입니다.
- Task 002는 수집/저장까지만 포함합니다. LLM 요약, 랭킹, Slack 발송, Hermes `/cron`, GCP 배포, 웹 UI는 포함하지 않습니다.
- 현재 브랜치는 Task 001 PR이 아직 merge되지 않아 `feature/001-llm-wiki-local-store` 기반으로 시작했습니다.
- X/Threads/Reddit/HN 및 유명 AI 개인 계정은 빠른 감지용 후보로만 기록했고, Task 002 enabled ingestion source에는 포함하지 않았습니다.
- X/Threads는 browser scraping이 아니라 공식 API 또는 수동 export/import를 전제로 합니다. Reddit/HN은 RSS/API 기반으로 시작합니다.

## 👀 리뷰 요청

- Source Registry config와 enabled/disabled source 구분이 Task 002 MVP 범위에 맞는지 확인 부탁드립니다.
- HTML parser의 lightweight selector 지원 범위가 MVP에 충분한지 확인 부탁드립니다.
- fetch/cache 부분 실패 정책과 non-2xx cache 처리 방식이 적절한지 확인 부탁드립니다.
- Task 003 랭킹/요약 단계로 넘길 데이터 모양이 충분한지 확인 부탁드립니다.
