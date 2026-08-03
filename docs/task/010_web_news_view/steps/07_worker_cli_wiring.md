# Step 07 - News CLI and GCE wiring

- 요구사항: WEB-10
- 구현 파일: `src/cli.ts`, `package.json`, `scripts/gce/install-news-service.sh`, nginx/systemd template
- 테스트 파일: `tests/cli.test.ts`, `tests/deployment-assets.test.ts`, 기존 `tests/cron-http.test.ts` 회귀
- 테스트: news server startup, read-only DB, GCE service/nginx contract, existing cron auth/POST regression
- 완료 조건: public GCE news process가 secret 없이 별도 port에서 동작하고 private Cloud Run worker 파일은 변경되지 않음
- 검수: GCE deployment, filesystem 권한, public/private security boundary 독립 검수
