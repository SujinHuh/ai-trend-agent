# Showcase Workflow

## 목적

각 큰 구현 단계가 끝났을 때 사용자가 브라우저에서 완료 결과를 직접 확인할 수 있게 한다.

이 문서의 showcase는 제품용 웹 UI가 아니라 구현 완료 확인용 정적 문서다.

## 작성 순서

1. 해당 큰 단계의 구현과 검증을 끝낸다.
2. task의 `phase_status.md`에서 검수 상태를 확인한다.
3. task의 `validation_report.md`에서 검증 명령, 결과, 남은 리스크를 확인한다.
4. `docs/showcase/<NNN_task_name>/completion.md`를 작성한다.
5. 같은 내용을 브라우저에서 볼 수 있도록 `completion.html`을 작성한다.
6. 로컬 또는 GCP 공개 경로에서 HTML이 열리는지 확인한다.
7. 실제 확인 URL과 검증 결과를 `docs/logs/YYYY-MM-DD.md`에 기록한다.

## HTML 형식 기준

새 completion HTML은 기존 v2 completion HTML 형식을 따른다.

기준 파일:

```text
docs/showcase/006_gcp_deployment/completion.html
docs/showcase/007_social_allow_list/completion.html
```

일관성 규칙:

- `<html lang="ko">`를 사용한다.
- `main` 폭은 `1040px`, padding은 `48px 20px` 계열을 따른다.
- 첫 영역은 `.hero` 섹션으로 두고, `h1`과 한 문단 요약을 둔다.
- 주요 내용은 `.grid`와 `.card` 조합으로 배치한다.
- card radius는 기존처럼 `8px` 이하로 유지한다.
- 검증 명령은 어두운 `pre code` 블록으로 표시한다.
- 사용자 확인 링크는 GCP 공개 URL을 우선 표기한다.
- localhost URL은 내부 확인용으로만 쓰고, 최종 사용자-facing 링크로 쓰지 않는다.

## 파일 경로

```text
docs/showcase/<NNN_task_name>/
  completion.md
  completion.html
```

`<NNN_task_name>`은 placeholder이므로 실제 task 이름으로 바꿔서 사용한다.

예시:

```text
docs/showcase/001_llm_wiki_local_store/completion.html
```

## 로컬 확인

정적 문서 서버:

```bash
npm run docs:serve
```

기본 확인 URL:

```text
http://127.0.0.1:4173/showcase/<NNN_task_name>/completion.html
```

Task 001 예시:

```text
http://127.0.0.1:4173/showcase/001_llm_wiki_local_store/completion.html
```

주의:

- Codex 실행 환경에서 `curl`이 `200 OK`를 반환해도 사용자 브라우저에서 `127.0.0.1` 접근이 보장되지는 않는다.
- `127.0.0.1`은 브라우저가 실행되는 환경의 localhost를 가리킨다.
- 브라우저에서 서버 URL이 열리지 않으면 HTML 파일을 직접 연다.

직접 확인 파일:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/<NNN_task_name>/completion.html
```

## GCP VM 외부 확인

사용자가 GCP VM 외부에서 접근해야 하면 이미 열려 있는 nginx 공개 경로에 HTML을 배치한다.

Task 001 공개 URL:

```text
http://34.22.67.160/ai-trend-agent/showcase/001_llm_wiki_local_store/completion.html
```

원칙:

- 외부 URL은 작업 로그와 최종 응답에 남긴다.
- 서버 내부 `curl 200 OK`와 사용자 브라우저 접근 가능성을 구분해 기록한다.
- HTML의 텍스트와 코드 블록은 사용자가 바로 읽을 수 있어야 한다.
