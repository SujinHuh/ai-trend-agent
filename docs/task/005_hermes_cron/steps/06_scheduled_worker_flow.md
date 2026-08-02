# 06. Scheduled Worker Flow

## Goal

Create a reusable worker that runs the daily digest flow for cron.

## Flow

1. Resolve KST report date.
2. Validate cron mode.
3. Create or claim a cron run record.
4. Run source ingestion.
5. Run trend synthesis and candidate selection.
6. Render Slack payload.
7. In dry-run mode, return preview result without network and without a send-blocking success.
8. In send mode, send Slack through injectable sender.
9. Persist cron run status with the last completed step.

## Acceptance

Worker can be tested without real Slack and without external network.

Failures after the run is claimed must be persisted with the failed step name and redacted error message.
