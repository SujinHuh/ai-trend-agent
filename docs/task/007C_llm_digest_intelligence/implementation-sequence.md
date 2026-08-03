# Task 007C Implementation Sequence - LLM Digest Intelligence

## Numbered Work

1. Branch and dependency check.
2. Task document creation and phase status setup.
3. LLM provider abstraction.
4. Prompt input builder with secret redaction.
5. Structured LLM response parser.
6. Token and cost usage log.
7. Digest candidate LLM enrichment.
8. Slack rendering handoff.
9. Deterministic fallback and disabled mode.
10. Tests.
11. Validation report.
12. Completion markdown and HTML.
13. PR and next handoff.

## Guardrails

- Do not send raw secrets to the LLM.
- Do not send all crawled items by default.
- Do not allow LLM output to override official-source confirmation policy.
- Store token and cost usage every time LLM mode runs.
- Keep crawler-only mode available.
