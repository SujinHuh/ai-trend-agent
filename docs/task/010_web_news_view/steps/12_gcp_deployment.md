# Step 12 - GCP deployment

- 요구사항: Harness public confirmation
- 변경 파일: `scripts/gce/**`, 실제 systemd/nginx 설정
- 검증: GCP `/ai-trend-agent/news`와 showcase HTTP 200, 본문 marker, process의 read-only persistent DB path/owner/backup 확인
- 완료 조건: 실제 외부 URL에서 Task 010 화면과 보고서를 사용할 수 있고 `/cron`은 공개되지 않음
- 검수: deployment/public output 검수, Step 13에서 배포 diff 포함 전체 재검수
