# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 007: Social Allow-List Signal Ingestion`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 🔍 변경 내용 요약

- social source와 social signal item domain type을 추가했습니다.
- disabled-by-default social registry config를 추가했습니다.
- source별 token/platform policy gate가 있는 social registry validation을 추가했습니다.
- public HTTPS URL과 provenance가 있는 manual JSONL importer를 추가했습니다.
- Hacker News, Reddit RSS fixture normalizer를 추가했습니다.
- `social_signal_items` SQLite storage와 store 메서드를 추가했습니다.
- social signal이 기존 official `SourceEvidence`와 연결될 때만 보조 신호로 쓰이도록 matching 로직을 추가했습니다.
- ranking에 capped social velocity boost를 추가하되, social-only claim의 confidence는 올리지 않도록 제한했습니다.
- `social:validate`, `social:import`, `social:list` CLI를 추가했습니다.

## ❓ 변경 이유

- 공식 출처만으로는 빠른 AI trend 신호를 놓칠 수 있으므로, 신뢰 가능한 social/community 신호를 낮은 권한과 낮은 신뢰도로 먼저 수집할 수 있어야 합니다.
- 다만 social 신호는 검증력이 약하므로 allow-list, disabled default, official evidence matching, `needs_confirmation` 정책이 필요합니다.
- X/Threads live collector와 HN/Reddit live polling runner는 token/rate limit/platform policy 확인 전까지 구현하지 않고 007B 후속 확장으로 분리했습니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [ ] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
npm run build
npm test -- tests/social-source-config.test.ts tests/social-normalization.test.ts tests/schema.test.ts tests/trend-ranking.test.ts tests/cli.test.ts
npm test
git diff --check
```

- typecheck 통과
- build 통과
- focused suite 통과: 5 files / 37 tests
- 전체 테스트 통과: 20 files / 127 tests
- diff check 통과

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

없음

## 💡 추가 설명

- Completion 문서:
  - `docs/showcase/007_social_allow_list/completion.md`
  - `docs/showcase/007_social_allow_list/completion.html`
- 공개 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007_social_allow_list/completion.html
```

- 보안/정책상 Deferred:
  - X live collector
  - Threads live collector
  - 실제 HN/Reddit live polling runner
- 위 항목은 007 완료 조건이 아니라 `007B_social_live_collectors` 후속 확장입니다.

## 👀 리뷰 요청

- social source가 기본 disabled 상태이고 명시적으로 enable해야만 실행되는지 확인해주세요.
- manual import가 public HTTPS URL과 provenance를 요구하는지 확인해주세요.
- social-only signal이 `confirmed`로 승격되지 않고 `needs_confirmation` 정책을 지키는지 확인해주세요.
- official domain matching과 capped ranking boost가 과도하게 confidence를 올리지 않는지 확인해주세요.
