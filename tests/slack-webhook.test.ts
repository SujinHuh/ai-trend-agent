import { describe, expect, it } from "vitest";

import { getWebhookHost, sendSlackWebhook } from "../src/slack/slack-webhook.js";

describe("sendSlackWebhook", () => {
  it("sends payload through an injectable transport and redacts URL to host", async () => {
    const result = await sendSlackWebhook({
      webhookUrl: "https://hooks.slack.com/services/test/path",
      payload: {
        text: "hello",
        blocks: []
      },
      transport: async (input) => {
        expect(input.url).toBe("https://hooks.slack.com/services/test/path");
        expect(input.body).toContain("hello");
        return {
          status: 200,
          body: "ok"
        };
      },
      now: () => new Date("2026-08-01T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 200,
      errorMessage: null,
      sentAt: "2026-08-01T00:00:00.000Z"
    });
    expect(JSON.stringify(result)).not.toContain("/services/test/path");
  });

  it("returns failed result for non-2xx responses", async () => {
    const result = await sendSlackWebhook({
      webhookUrl: "https://hooks.slack.com/services/test/path",
      payload: {
        text: "hello",
        blocks: []
      },
      transport: async () => ({
        status: 500,
        body: "server error"
      })
    });

    expect(result).toMatchObject({
      ok: false,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 500,
      errorMessage: "server error"
    });
  });

  it("redacts webhook URLs from transport errors", async () => {
    const result = await sendSlackWebhook({
      webhookUrl: "https://hooks.slack.com/services/test/path",
      payload: {
        text: "hello",
        blocks: []
      },
      transport: async () => {
        throw new Error("failed https://hooks.slack.com/services/test/path");
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("https://hooks.slack.com/services/[redacted]");
    expect(result.errorMessage).not.toContain("/test/path");
  });

  it("redacts encoded and newline-split webhook URLs from transport errors", async () => {
    const result = await sendSlackWebhook({
      webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
      payload: {
        text: "hello",
        blocks: []
      },
      transport: async () => {
        throw new Error(
          [
            "failed https%3A%2F%2Fhooks.slack.com%2Fservices%2FT000%2FB000%2FencodedSecret",
            "retry http://hooks.slack.com/services/T000",
            "/B000",
            "/newlineSecret"
          ].join("\n")
        );
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("https%3A%2F%2Fhooks.slack.com%2Fservices%2F[redacted]");
    expect(result.errorMessage).toContain("https://hooks.slack.com/services/[redacted]");
    expect(result.errorMessage).not.toContain("encodedSecret");
    expect(result.errorMessage).not.toContain("newlineSecret");
    expect(result.errorMessage).not.toContain("/T000");
    expect(result.errorMessage).not.toContain("/B000");
  });

  it("returns a failed result for invalid webhook configuration", async () => {
    const result = await sendSlackWebhook({
      webhookUrl: "https://example.com/services/test/path",
      payload: {
        text: "hello",
        blocks: []
      },
      transport: async () => {
        throw new Error("should not be called");
      }
    });

    expect(result).toMatchObject({
      ok: false,
      webhookHost: "invalid",
      httpStatusCode: null,
      errorMessage: "SLACK_WEBHOOK_URL must be a valid URL"
    });
  });

  it("rejects non-Slack webhook hosts", () => {
    expect(() => getWebhookHost("https://example.com/services/test")).toThrow(/SLACK_WEBHOOK_URL/);
  });

  it("rejects non-HTTPS and non-services Slack webhook URLs", () => {
    expect(() => getWebhookHost("http://hooks.slack.com/services/test")).toThrow(/SLACK_WEBHOOK_URL/);
    expect(() => getWebhookHost("https://hooks.slack.com/not-services/test")).toThrow(/SLACK_WEBHOOK_URL/);
  });
});
