# 📝 PR Template

## 📌 변경 사항

✅ PR 제목 : `Task 006: GCP Cloud Run 배포`

- [x] 신규 기능 추가
- [ ] 버그 수정
- [ ] 코드 리팩토링
- [x] 문서 업데이트
- [x] 기타

## 🔍 변경 내용 요약

- compiled cron worker runtime을 위한 production build/start script를 추가했습니다.
- Cloud Run worker용 Dockerfile과 `.dockerignore`를 추가했습니다.
- Secret Manager 설정, Cloud Run 배포, Cloud Scheduler 생성, deployment smoke script를 추가했습니다.
- Worker/Hermes service account, Secret Manager, Cloud Scheduler invoker 보안 경계를 문서화했습니다.
- Cloud Run worker를 private service로 배포하고, Cloud Scheduler가 OIDC로 `/cron`을 호출하는 구성을 검증했습니다.
- 배포 산출물 테스트를 추가했습니다.

## ❓ 변경 이유

- Task 005에서 만든 `/cron` worker를 실제 운영 환경에서 매일 실행하려면 Cloud Run, Secret Manager, Cloud Scheduler 경계가 필요합니다.
- Slack webhook과 cron secret을 repo나 image에 넣지 않고 Secret Manager에서만 참조하도록 배포 경계를 고정해야 합니다.
- Hermes agent를 Docker/Cloud Run 저권한 호출 주체로 분리하기 전에, worker의 비밀키/side effect 경계를 먼저 잠그기 위한 작업입니다.

## 🛠 테스트 및 검증

- [x] 로컬 실행 테스트
- [x] 단위 테스트
- [x] API 요청/응답 확인
- [x] 코드 컨벤션 준수
- [x] 문서/요구사항 검수

검증 결과:

```text
npm run typecheck
npm run build
npm test
git diff --check
bash -n scripts/cloud-run/*.sh
node dist/src/cli.js cron:run --date=2026-08-02 --dry-run
DOCKER_API_VERSION=1.41 docker build -t ai-trend-agent:task006 .
DOCKER_API_VERSION=1.41 docker run --rm ai-trend-agent:task006 node dist/src/cli.js cron:run --date=2026-08-02 --dry-run
```

- typecheck 통과
- build 통과
- 전체 테스트 통과: 18 files / 117 tests
- diff check 통과
- Docker image build 통과
- Docker runtime dry-run 통과
- image content check에서 `.env`, `.git`, tests, data, cache, showcase 산출물이 제외된 것을 확인했습니다.
- unauthenticated `/cron` 호출이 `403`을 반환하는 것을 확인했습니다.
- Cloud Scheduler manual invocation이 Cloud Run `POST 200`으로 기록되는 것을 확인했습니다.

운영 배포 확인:

- Project: `project-7296a491-98d3-4b50-abe`
- Region: `asia-northeast3`
- Cloud Run service: `ai-trend-worker`
- Cloud Run URL: `https://ai-trend-worker-edjrjtiwga-du.a.run.app`
- Scheduler job: `ai-trend-daily-digest`
- Schedule: `0 7 * * *`, `Asia/Seoul`

## 🔗 연관 이슈

<!-- 관련된 이슈 번호를 입력해주세요. (예: Closes #123) -->

없음

## 💡 추가 설명

- Completion 문서:
  - `docs/showcase/006_gcp_deployment/completion.md`
  - `docs/showcase/006_gcp_deployment/completion.html`
- 공개 확인 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/006_gcp_deployment/completion.html
```

- 이 PR에는 Cloud SQL/Firestore migration, Cloud Storage raw snapshot migration, full Hermes learning service deployment, Task 007 social allow-list가 포함되지 않습니다.
- Slack webhook URL, `CRON_SECRET`, 인증 코드, token 원문은 문서와 repo에 기록하지 않았습니다.

## 👀 리뷰 요청

- Cloud Run이 unauthenticated access 없이 private worker로 유지되는지 확인해주세요.
- Secret Manager와 service account 권한 경계가 과도하지 않은지 확인해주세요.
- Scheduler OIDC invoker와 `X-Cron-Secret` 이중 보호 구성이 적절한지 확인해주세요.
