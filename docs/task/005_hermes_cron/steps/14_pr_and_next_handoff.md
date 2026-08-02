# 14. PR and Next Handoff

## Goal

Create a PR body draft and hand off the next v2 task.

## Outputs

- `docs/pr/005_hermes_cron.md`
- next task list
- completion HTML URL for user review

## Acceptance

Handoff clearly identifies Task 006 GCP deployment as next.

Task 005 completion report:

```text
http://34.22.67.160/ai-trend-agent/showcase/005_hermes_cron/completion.html
```

Local docs URL:

```text
http://127.0.0.1:4173/showcase/005_hermes_cron/completion.html
```

Direct file:

```text
/home/sujin941220/Playground/ai-trend-agent/docs/showcase/005_hermes_cron/completion.html
```

## Task 006 Security Handoff

- Deploy AI Trend worker as the secret-bearing service.
- Deploy Hermes agent as a separate Docker/Cloud Run container.
- Hermes should keep only `CRON_SECRET` or a limited worker invocation token.
- Worker should keep `SLACK_WEBHOOK_URL`, DB write permission, and Secret Manager access.
- Worker deployment must use Secret Manager for `SLACK_WEBHOOK_URL` and `CRON_SECRET`.
- `/cron` invocation must be protected by Cloud Run IAM/OIDC or `CRON_SECRET`.
- Worker container must not mount or access unrelated host folders.
- Runtime service accounts must be least-privilege and split between Hermes and Worker.
- Hermes may learn from execution results, feedback, and policy memory.
- Hermes must not store raw secrets, full webhook URLs, sensitive logs, or broad GCP credentials in learning memory.
- The product behavior remains a scheduled AI trend Slack digest, initially every day at `07:00 KST`.
