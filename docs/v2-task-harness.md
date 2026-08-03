# v2 Task Harness

## 1. Purpose

This harness keeps every v2 task on the same repeatable path.

Use it before starting a task, while implementing it, before opening a PR, and after merge.

The goal is to avoid repeating manual checks from memory:

- current v2 task selection
- previous task merge status
- task document readiness
- implementation and validation status
- completion `md` and `html` showcase
- PR body and merge status
- work log update

## 2. Task Lifecycle

Each v2 task follows this lifecycle.

```text
Pending -> In Progress -> Review -> Done
```

Status meanings:

- `Pending`: task exists but implementation has not started.
- `In Progress`: implementation or documentation is actively being changed.
- `Review`: implementation is done, but validation, showcase, PR, or merge confirmation remains.
- `Done`: required files, validation, showcase, PR, and merge state are confirmed.

Do not mark a task `Done` only because the implementation seems finished.

## 3. Harness Commands

These commands are intended names for the repo automation.

They may start as manual checklist sections in this document, then become npm scripts later.

```text
npm run task:gate -- --task=003
npm run task:verify -- --task=003
npm run task:showcase -- --task=003
npm run task:pr -- --task=003
```

Until scripts exist, run the matching checklist sections below manually.

## 4. Gate Check

Run before starting a new task.

Inputs:

- task number, for example `003`
- task slug, for example `trenditem_ranking`
- current branch
- current `main` status

Checklist:

1. Confirm current v2 sequence:
   - `docs/implementation-sequence-v2.md`
2. Confirm previous tasks are merged into `main`.
3. Confirm the next task folder exists:
   - `docs/task/<NNN_task_slug>/`
4. Confirm required task docs exist:
   - `requirements.md`
   - `implementation-sequence.md`
   - `phase_status.md`
5. Confirm the task scope does not include later tasks by accident.
6. Confirm `phase_status.md` has a clear first actionable step.
7. Confirm branch strategy:
   - if previous task is merged, branch from `main`
   - if previous task is not merged, document the dependency explicitly
8. Add or update a work log line in:
   - `docs/logs/YYYY-MM-DD.md`

Gate output format:

```text
Task: 003_trenditem_ranking
Previous tasks: main merged / not merged
Required docs: pass / fail
Branch source: main / dependent feature branch
Decision: ready / blocked
Notes:
- ...
```

## 5. Implementation Check

Run while implementing.

Checklist:

1. Keep changes scoped to the current task.
2. Update `phase_status.md` as steps move.
3. Add tests when behavior, storage, parsing, ranking, delivery, or public output changes.
4. Keep disabled/backlog sources documented instead of silently dropping them.
5. Record meaningful implementation progress in `docs/logs/YYYY-MM-DD.md`.
6. If a change affects task boundaries, update:
   - `docs/implementation-sequence-v2.md`
   - task `requirements.md`
   - task `implementation-sequence.md`

### Numbered Step Loop

When a task has numbered steps in `implementation-sequence.md` or `phase_status.md`, run the implementation loop per numbered step.

For each step:

```text
1. Mark only that step In Progress.
2. Implement the step.
3. Add the required tests for that step before claiming it is done.
4. Run the smallest useful local validation for that step.
5. Run sub-agent review for risk-bearing implementation steps.
6. Apply review findings or explicitly document a deferral.
7. Re-run validation after fixes.
8. Mark that step Done only after validation, test evidence, and required review evidence are recorded.
```

Do not mark several numbered steps `Done` as a batch unless the validation report says which steps were reviewed together and why batching was appropriate.

Risk-bearing implementation steps require sub-agent review. These include numbered steps that change schema, parser behavior, ingestion, external APIs, storage, ranking, LLM behavior, Slack, cron, deployment, security, credentials, rate limits, legal collection boundaries, public output, or future-scope docs.

Do not defer normal test code to the end of the task. Unit, integration, and regression tests should be added in the same numbered step that introduces the behavior whenever practical. If a test is intentionally deferred, record why in `validation_report.md` and list the remaining risk.

Test category guidance:

- Unit tests: pure logic, parser, redaction, scoring, cost calculation, fallback decisions.
- Integration tests: SQLite store, CLI command wiring, Slack digest build path, cron runner path.
- Regression tests: existing commands and renderers that must keep working after the new behavior is added.
- External live tests: only when policy, credentials, rate limits, and network access make them safe; otherwise record why they are excluded.

Low-risk steps may be reviewed in a batch or by the final whole-task review. Examples: simple CLI wiring, link-only docs corrections, PR URL recording, phase status updates, or minor text cleanup.

Every task must still run a final whole-task sub-agent review before PR. If unsure whether a step is risk-bearing, run sub-agent review for that step.

For sub-agent-reviewed steps, record:

- step number and title
- sub-agent review scope
- findings by severity
- fixes applied
- commands re-run after fixes
- remaining accepted risks

## 6. Verification Check

Run after implementation and before PR.

Required checks:

```text
git diff --check
npm run typecheck
npm test
```

Task-specific checks:

- Task 001: DB init, seed, digest get.
- Task 002: source config validation, cached ingestion, live ingestion when network is available.
- Task 003: ranking fixture validation, score ordering, confirmation status, stale item handling.
- Task 004: Slack payload rendering without sending by default.
- Task 005: cron idempotency and duplicate-send prevention.

Validation output must be recorded in:

```text
docs/task/<NNN_task_slug>/validation_report.md
docs/logs/YYYY-MM-DD.md
```

## 7. Showcase Check

Run when a whole v2 task is user-checkable.

Required files:

```text
docs/showcase/<NNN_task_slug>/
  completion.md
  completion.html
```

The `completion.md` is the reviewable source report.

The `completion.html` is the browser-checkable middle report.

The `dist/` folder is a deployment artifact and should not be committed as the canonical report.

Required showcase content:

1. task title
2. current status
3. what was implemented
4. what was intentionally excluded
5. validation commands and results
6. public or local confirmation URL
7. next task handoff

Report language:

- Write `validation_report.md`, `completion.md`, `completion.html`, and `docs/pr/<NNN_task_slug>.md` in Korean unless the user explicitly asks otherwise.
- Keep only code identifiers, file paths, commands, enum values, API names, and proper nouns in English when needed.

Local check:

```text
npm run docs:serve
http://127.0.0.1:4173/showcase/<NNN_task_slug>/completion.html
```

GCP check:

```text
http://34.22.67.160/ai-trend-agent/showcase/<NNN_task_slug>/completion.html
```

The final user-facing task result must include this GCP URL after confirming HTTP 200 and the task body. Do not finish with only a local file path or localhost URL when the user needs to view the report externally.

Update these references after creating the showcase:

- `docs/README-docs.md`
- `docs/implementation-sequence-v2.md`
- `docs/task/<NNN_task_slug>/validation_report.md`
- `docs/logs/YYYY-MM-DD.md`
- PR body document under `docs/pr/`

## 8. PR Check

Run before opening or updating a PR.

Checklist:

1. Re-open and read the repo PR templates before writing or editing the PR body:
   - `.github/PULL_REQUEST_TEMPLATE.md`
   - `docs/pr-template.md`
2. Confirm the PR body keeps the template structure exactly:
   - `# 📝 PR Template`
   - `## 📌 변경 사항`
   - `## 🔍 변경 내용 요약`
   - `## ❓ 변경 이유`
   - `## 🛠 테스트 및 검증`
   - `## 🔗 연관 이슈`
   - `## 💡 추가 설명`
   - `## 👀 리뷰 요청`
3. Write the PR title and body explanation in Korean unless the user explicitly asks otherwise.
4. Keep only code identifiers, file paths, commands, enum values, API names, and proper nouns in English when needed.
5. Confirm PR body is saved under:
   - `docs/pr/<NNN_task_slug>.md`
6. Confirm validation results are copied into the PR body.
7. Confirm test coverage is described by category:
   - unit tests
   - integration/CLI or storage tests
   - regression tests
   - intentionally excluded tests
8. Confirm showcase links are included.
9. Confirm branch is pushed.
10. Confirm PR is not Draft once implementation, validation, and showcase are ready.
11. Confirm base branch:
   - usually `main`
   - dependent feature branch only when prior task is not merged
12. After opening or editing the GitHub PR, run `gh pr view` and confirm the live PR body still follows the template.
13. Confirm GitHub PR state after creation or update.

PR output format:

```text
PR: <url>
State: OPEN / MERGED
Draft: true / false
Base: main
Head: feature/<task>
Validation: pass / fail
Showcase: pass / fail
```

## 9. Merge Check

Run after PR merge.

Checklist:

1. Confirm PR state is `MERGED`.
2. Fetch `origin/main`.
3. Confirm `origin/main` contains the merge commit.
4. Update task `phase_status.md` final step to `Done`.
5. Update `completion.md` and `completion.html` from review state to merged state.
6. Update `docs/logs/YYYY-MM-DD.md`.
7. Push final docs status cleanup to `main` if needed.
8. Confirm public showcase URL still returns the expected task HTML.

Merge output format:

```text
Task: <NNN_task_slug>
PR: <url>
Merged at: <timestamp>
origin/main: <commit>
Showcase URL: pass / fail
Working tree: clean / dirty
```

## 10. Sub-Agent Review Policy

For intermediate step review, the risk-bearing categories are:

- storage schema
- source ingestion or parsing
- ranking or LLM prompt behavior
- Slack delivery
- cron, idempotency, or deployment
- security, credentials, rate limits, or legal collection boundaries
- broad docs that define future task scope

For small docs-only status updates, local checklist review is enough.

This section does not weaken the numbered step loop. Risk-bearing numbered steps require sub-agent review before `Done`, and every task requires final whole-task sub-agent review before PR.

Sub-agent review output should be summarized in:

```text
docs/task/<NNN_task_slug>/validation_report.md
docs/logs/YYYY-MM-DD.md
```

## 11. Solo Developer Reminder

Assume the user is a solo developer and may not catch fast-moving AI trend changes or process drift immediately.

When giving feedback:

- call out what changed since the previous task
- separate confirmed facts from candidates and backlog
- make next actions explicit
- keep social and unofficial signals behind a trust policy
- do not silently expand scope because a new AI trend is interesting

This reminder applies to every v2 task review.
