# PR Workflow

## 1. 목적

git add, commit, push, PR 생성 단계에서 항상 같은 형식으로 변경 내용을 정리한다.

PR 본문은 `docs/pr-template.md` 형식을 기준으로 작성한다.

## 2. 기본 루프

1. 변경 파일 확인
2. 테스트 또는 검증 실행
3. 작업 로그 기록
4. 필요한 경우 서브 에이전트 검수
5. `git add`
6. `git commit`
7. `git push`
8. push 완료 로그 기록
9. PR 템플릿 기준으로 PR 본문 작성
10. PR 생성 또는 사용자에게 PR 본문 제공
11. PR 생성 결과 로그 기록

## 3. PR 작성 기준

PR에는 다음을 반드시 포함한다.

- 변경 사항 유형
- 변경 내용 요약
- 변경 이유
- 테스트 및 검증 결과
- 리뷰 요청 포인트

테스트를 실행하지 못한 경우 체크하지 않고, 이유를 `추가 설명`에 적는다.

## 4. 자동화 기준

Codex가 git push 이후 PR을 작성할 때는 다음 순서로 한다.

1. `git status`로 변경 파일을 확인한다.
2. `git diff --cached` 또는 최근 커밋 diff를 확인한다.
3. 변경 내용을 PR 템플릿에 맞게 요약한다.
4. 테스트 실행 여부를 확인한다.
5. PR 본문을 작성한다.
6. `gh pr create` 같은 도구 사용 가능 여부를 확인한다.

GitHub CLI나 인증이 없으면 PR 본문만 작성한다.

## 5. 로그 정책

PR 준비, push 완료, PR 생성 결과를 `docs/logs/YYYY-MM-DD.md`에 한 줄로 기록한다.

예시:

```text
22:10 | ops | PR 본문 작성 및 push 준비 | docs/pr-template.md
22:12 | ops | git push 완료 | branch-name
22:14 | ops | PR 생성 완료 | PR URL
```
