# PR Template

## 변경 사항

PR 제목: `Task 007B: 소셜 Live Collector`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [ ] 기타

## 변경 내용 요약

- social source config에 `livePolling` 계약을 추가했습니다.
- HN Firebase API live polling runner를 추가했습니다.
- Reddit subreddit RSS live polling runner를 추가했습니다.
- 기존 source fetch cache를 재사용해 timeout, cache TTL, retry, backoff를 적용했습니다.
- `social:poll` CLI와 `social:poll --dry-run` 경로를 추가했습니다.
- live social signal도 기존 official `SourceEvidence`와 explicit URL matching을 거치도록 했습니다.
- malformed HN JSON이 전체 poll run을 중단하지 않고 source-level error로 기록되도록 했습니다.
- repeated HN poll이 TTL 안에서 cache hit를 사용하는지 테스트를 추가했습니다.
- X/Threads live collector는 계속 Deferred로 유지했습니다.

## 변경 이유

- Task 007은 social allow-list와 fixture-safe normalizer까지만 만들었고, 실제 HN/Reddit polling runner는 007B로 분리했습니다.
- Slack daily digest 품질을 높이려면 공식 출처보다 빠른 community signal을 낮은 신뢰도로 수집할 수 있어야 합니다.
- HN/Reddit은 credentials 없이 시작할 수 있으므로 X/Threads보다 낮은 정책 리스크로 live polling을 붙일 수 있습니다.

## 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [x] 외부 API 실요청 검증
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
npm run social:validate
npm run social:poll -- --date=2026-08-03 --dry-run
npm test -- tests/social-live-polling.test.ts tests/social-source-config.test.ts tests/cli.test.ts
npm test -- tests/social-source-config.test.ts tests/social-normalization.test.ts tests/social-live-polling.test.ts tests/cli.test.ts
git diff --check
npm run build
npm test
curl -I http://34.22.67.160/ai-trend-agent/showcase/007B_social_live_collectors/completion.html
```

- typecheck 통과
- social config validate 통과: 5 sources / 0 enabled
- default dry-run poll 통과: 0 polled / 0 saved
- real public HN/Reddit dry-run 통과: 2 polled / 0 saved
- focused suite 통과: 4 files / 27 tests
- post-review focused suite 통과: 3 files / 23 tests
- diff check 통과
- build 통과
- 전체 테스트 통과: 21 files / 133 tests
- GCP public completion HTML 확인 통과: HTTP 200

서브 에이전트 리뷰:

- code/security review 완료: malformed HN JSON error boundary 지적 반영.
- docs/GCP review 완료: 사용자 확인 링크를 GCP public URL 기준으로 정리.
- final post-fix review 완료: PR blocking finding 없음.
- 남은 note: `pollingIntervalMinutes`는 007B에서 scheduling metadata이며 cron interval enforcement는 후속 통합 범위.

## 연관 이슈

없음

## 추가 설명

- Completion 문서:
  - `docs/showcase/007B_social_live_collectors/completion.md`
  - `docs/showcase/007B_social_live_collectors/completion.html`
- 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/007B_social_live_collectors/completion.html
```

## 리뷰 요청

- disabled source가 fetch를 호출하지 않는지 확인해주세요.
- HN/Reddit live polling이 timeout/cache/max item limit을 지키는지 확인해주세요.
- social-only signal이 `needs_confirmation`으로 남는지 확인해주세요.
- X/Threads가 token scope, rate limit, billing/app policy, app review 확인 전까지 Deferred로 유지되는지 확인해주세요.
