import { createHash } from "node:crypto";

import type { SlackWebhookPayload } from "../domain/types.js";

export interface SlackWebhookSendResult {
  ok: boolean;
  webhookHost: string;
  httpStatusCode: number | null;
  errorMessage: string | null;
  sentAt: string;
  payloadHash: string;
}

export type SlackWebhookTransport = (input: {
  url: string;
  body: string;
}) => Promise<{ status: number; body: string }>;

export async function sendSlackWebhook(input: {
  webhookUrl: string;
  payload: SlackWebhookPayload;
  transport?: SlackWebhookTransport;
  now?: () => Date;
}): Promise<SlackWebhookSendResult> {
  const body = JSON.stringify(input.payload);
  const payloadHash = createPayloadHash(body);
  const sentAt = (input.now ?? (() => new Date()))().toISOString();
  const transport = input.transport ?? defaultTransport;
  let webhookHost = "invalid";

  try {
    webhookHost = getWebhookHost(input.webhookUrl);
    const response = await transport({
      url: input.webhookUrl,
      body
    });
    const ok = response.status >= 200 && response.status < 300;

    return {
      ok,
      webhookHost,
      httpStatusCode: response.status,
      errorMessage: ok ? null : truncateError(response.body),
      sentAt,
      payloadHash
    };
  } catch (error: unknown) {
    return {
      ok: false,
      webhookHost,
      httpStatusCode: null,
      errorMessage: redactSecretText(error instanceof Error ? error.message : String(error)),
      sentAt,
      payloadHash
    };
  }
}

export function getWebhookHost(webhookUrl: string): string {
  try {
    const url = new URL(webhookUrl);
    const host = url.host;
    if (url.protocol !== "https:") {
      throw new Error("SLACK_WEBHOOK_URL must use https");
    }
    if (host !== "hooks.slack.com") {
      throw new Error("SLACK_WEBHOOK_URL host must be hooks.slack.com");
    }
    if (!url.pathname.startsWith("/services/")) {
      throw new Error("SLACK_WEBHOOK_URL path must start with /services/");
    }
    return host;
  } catch {
    throw new Error("SLACK_WEBHOOK_URL must be a valid URL");
  }
}

export function createPayloadHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

async function defaultTransport(input: { url: string; body: string }): Promise<{ status: number; body: string }> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: input.body
  });

  return {
    status: response.status,
    body: await response.text()
  };
}

function truncateError(value: string): string {
  return value.length <= 300 ? value : `${value.slice(0, 299)}.`;
}

export function redactSecretText(value: string): string {
  const redacted = value
    .replace(
      /https?:\/\/hooks\.slack\.com\/services(?:\s*\/\s*[^/\s"'<>)]*){0,3}/gi,
      "https://hooks.slack.com/services/[redacted]"
    )
    .replace(
      /https?%3A%2F%2Fhooks\.slack\.com%2Fservices(?:%2F[^%\s"'<>)]*){0,3}/gi,
      "https%3A%2F%2Fhooks.slack.com%2Fservices%2F[redacted]"
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret)=([^&\s]+)/gi, "$1=[redacted]");

  return truncateError(redacted);
}
