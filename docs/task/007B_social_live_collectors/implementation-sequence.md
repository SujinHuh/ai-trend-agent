# Task 007B Implementation Sequence - Social Live Collectors

## Numbered Work

1. Branch and dependency check.
2. Task document creation and phase status setup.
3. HN live polling config contract.
4. Reddit RSS live polling config contract.
5. HN live polling runner.
6. Reddit RSS live polling runner.
7. CLI or cron integration for enabled social polling.
8. Official evidence matching handoff.
9. X/Threads deferred policy documentation.
10. Tests.
11. Validation report.
12. Completion markdown and HTML.
13. PR and next handoff.

## Guardrails

- Every collector must be disabled by default.
- Every live call must use timeout, max items, and cache controls.
- Do not store API tokens in repo, logs, DB rows, Slack messages, or Hermes memory.
- Social signals support ranking only as weak secondary evidence.
- Social-only claims must remain `needs_confirmation`.

## Next Handoff

After 007B, choose between:

- `007C_llm_digest_intelligence`: LLM summary, importance judgment, and token/cost logging.
- `008_domain_expansion`: Backend, Frontend, DevOps source/domain expansion.
