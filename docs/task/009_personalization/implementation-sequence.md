# Task 009 구현 순서 - Slack 피드백과 개인화

1. PR #11 병합과 최신 `main`을 확인하고 feature branch를 만든다.
2. Task 009 요구사항, 계획, 구현 순서, 상태표를 작성한다.
3. personalization domain type과 입력 validation을 정의한다.
4. profile/feedback SQLite schema와 drift assertion을 추가한다.
5. profile/feedback store API와 테스트를 구현한다.
6. candidate tag 추출과 deterministic personalization policy를 구현한다.
7. digest candidate selection에 선택적 개인화를 연결한다.
8. Slack build/send path에 선택적 `userId` 전달을 추가한다.
9. feedback/profile/preview CLI와 통합 테스트를 구현한다.
10. focused test, typecheck, build, full test를 실행한다.
11. 위험 단계와 전체 변경을 독립 검수하고 지적을 반영한다.
12. validation report와 completion Markdown/HTML을 작성한다.
13. PR 템플릿을 확인하고 PR 문서, push, PR handoff를 완료한다.

각 단계는 [v2 Task Harness](../../v2-task-harness.md)의 numbered step loop를 따른다.

