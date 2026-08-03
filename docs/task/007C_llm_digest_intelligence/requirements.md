# Task 007C Requirements - LLM Digest Intelligence

## Goal

Add LLM-backed digest intelligence so the daily `07:00 KST` Slack message contains useful summaries and judgment, not only crawled links.

## Scope

- LLM provider abstraction for digest intelligence.
- Top 5-10 candidate summarization after deterministic ranking.
- `summary`, `whyItMatters`, and `practicalImpact` generation.
- Importance, urgency, action level, and user-interest relevance judgment.
- Token usage and estimated cost logging.
- Prompt safety rules that prevent secrets from entering model input.

## Non-Scope

- Full article summarization for every crawled item.
- Multi-model review.
- Slack interactive personalization.
- Hermes autonomous execution of arbitrary model-generated commands.

## Acceptance Criteria

1. Crawler-only mode still works with zero LLM token usage.
2. LLM mode only sends selected top candidates to the model by default.
3. Input/output tokens and estimated cost are logged per run.
4. Prompt input excludes Slack webhook URL, `CRON_SECRET`, OAuth tokens, API keys, and auth codes.
5. LLM output cannot mark social-only claims as `confirmed`.
6. Tests cover provider abstraction, token accounting, prompt redaction, and deterministic fallback.
