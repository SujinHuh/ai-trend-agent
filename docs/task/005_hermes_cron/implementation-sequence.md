# Task 005 Implementation Sequence - Hermes Cron

## Goal

Connect Hermes-compatible cron execution to the daily AI trend digest flow.

## Steps

1. [Branch and dependency](steps/01_branch_and_dependency.md)
2. [Task documents](steps/02_task_documents.md)
3. [Cron run domain types](steps/03_cron_run_domain_types.md)
4. [Cron run schema](steps/04_cron_run_schema.md)
5. [Store functions](steps/05_store_functions.md)
6. [Scheduled worker flow](steps/06_scheduled_worker_flow.md)
7. [Idempotency guard](steps/07_idempotency_guard.md)
8. [HTTP cron endpoint](steps/08_http_cron_endpoint.md)
9. [Cron CLI](steps/09_cron_cli.md)
10. [Env example](steps/10_env_example.md)
11. [Tests](steps/11_tests.md)
12. [Validation](steps/12_validation.md)
13. [Completion reports](steps/13_completion_reports.md)
14. [PR and next handoff](steps/14_pr_and_next_handoff.md)

## Validation

Task 005 is complete only when local cron dry-run, cron send via injected sender tests, HTTP endpoint auth/idempotency tests, typecheck, and full tests pass.
