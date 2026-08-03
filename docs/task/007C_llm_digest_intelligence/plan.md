# Task 007C Plan - LLM Digest Intelligence

## Steps

1. Create task branch and task documents.
2. Add LLM provider interface and deterministic fallback.
3. Add prompt builder for digest candidates.
4. Add response schema for summary, why, practical impact, importance, urgency, and interest relevance.
5. Add token/cost usage log schema or extend cron audit logging.
6. Integrate LLM judgment after deterministic ranking and before Slack rendering.
7. Add config for model, max candidates, max input length, and daily cost guard.
8. Add tests for prompt safety, fallback, token accounting, and social-only confirmation guard.
9. Add validation report and completion showcase.
10. Create PR with Korean template.

## Cost Strategy

- Default candidates: Top 5.
- Maximum default candidates: Top 10.
- Full article fetch for LLM should remain opt-in.
- Daily estimated cost should be recorded and visible in logs.
