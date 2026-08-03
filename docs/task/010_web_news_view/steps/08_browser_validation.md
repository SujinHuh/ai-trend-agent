# Step 08 - Browser validation

- 요구사항: WEB-11
- 변경 파일: 필요 시 renderer CSS
- 검증: `1440x1000`, `390x844` Playwright screenshot을 `/tmp/task010-browser/`에 저장; 긴 title/source/tag fixture와 empty/error 화면; `scrollWidth <= clientWidth`, link/form interaction 확인
- reference: Rocket Brief URL 접근 여부와 채택한 날짜/Top Signals/원문 정보 계층 기록
- 완료 조건: 두 viewport에서 화면이 비어 있지 않고 텍스트/control overlap과 수평 overflow가 없음
- 검수: 최종 public output 검수에 포함
