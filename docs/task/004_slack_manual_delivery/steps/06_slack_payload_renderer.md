# Step 06 - Slack Payload Renderer

## Purpose

Render Task 003 digest candidates into Slack Incoming Webhook JSON.

## Inputs

- report date
- digest candidates

## Expected Changes

- title
- Top AI Signals section
- urgent section
- LLM Wiki stable IDs
- source links

## Files Likely To Change

- `src/slack/render-slack-digest.ts`
- `tests/slack-renderer.test.ts`

## Validation

Payload should be deterministic and valid JSON.

## Handoff Notes

Renderer must not send network requests.
