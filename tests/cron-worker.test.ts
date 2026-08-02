import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import type { NormalizedSourceConfig } from "../src/sources/source-config.js";
import { createPayloadHash } from "../src/slack/slack-webhook.js";
import { createHermesCronIdempotencyKey, getKstReportDate, runHermesCron } from "../src/cron/run-hermes-cron.js";

describe("runHermesCron", () => {
  it("computes the default report date in Asia/Seoul", () => {
    expect(getKstReportDate(new Date("2026-08-01T16:00:00.000Z"))).toBe("2026-08-02");
  });

  it("runs dry-run without a Slack webhook or sender", async () => {
    const { db, store } = openInitializedStore();

    try {
      const result = await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "dry_run",
        cacheRoot: tempCacheRoot(),
        fetcher: async () => sourceResponse(),
        now: fixedNow
      });

      expect(result).toMatchObject({
        reportDate: "2026-08-01",
        mode: "dry_run",
        status: "success",
        candidateCount: 1,
        slackAttempt: null,
        errorMessage: null
      });
      expect(result.payload?.text).toBe("AI Trend Daily Digest - 2026-08-01");
      expect(store.listCronRuns("2026-08-01")[0]).toMatchObject({
        mode: "dry_run",
        status: "success",
        candidateCount: 1
      });
    } finally {
      db.close();
    }
  });

  it("sends through an injectable Slack sender and records cron success", async () => {
    const { db, store } = openInitializedStore();
    const sendSlackWebhook = vi.fn(async (input) => ({
      ok: true,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 200,
      errorMessage: null,
      sentAt: "2026-08-01T00:00:00.000Z",
      payloadHash: createPayloadHash(JSON.stringify(input.payload))
    }));

    try {
      const result = await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "send",
        cacheRoot: tempCacheRoot(),
        webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
        sendSlackWebhook,
        fetcher: async () => sourceResponse(),
        now: fixedNow
      });

      expect(result.status).toBe("success");
      expect(result.slackAttempt).toMatchObject({
        webhookHost: "hooks.slack.com",
        status: "success"
      });
      expect(result.cronRun).toMatchObject({
        mode: "send",
        status: "success",
        slackAttemptId: result.slackAttempt?.id
      });
      expect(sendSlackWebhook).toHaveBeenCalledTimes(1);
    } finally {
      db.close();
    }
  });

  it("blocks duplicate successful send runs by idempotency key before Slack", async () => {
    const { db, store } = openInitializedStore();
    const sendSlackWebhook = vi.fn(async (input) => ({
      ok: true,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 200,
      errorMessage: null,
      sentAt: `2026-08-01T00:00:0${sendSlackWebhook.mock.calls.length}.000Z`,
      payloadHash: createPayloadHash(JSON.stringify(input.payload))
    }));
    const baseInput = {
      store,
      sources: [sourceConfig()],
      reportDate: "2026-08-01",
      mode: "send" as const,
      cacheRoot: tempCacheRoot(),
      webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
      sendSlackWebhook,
      fetcher: async () => sourceResponse(),
      now: fixedNow
    };

    try {
      const first = await runHermesCron(baseInput);
      const second = await runHermesCron({
        ...baseInput,
        cacheRoot: tempCacheRoot()
      });

      expect(first.status).toBe("success");
      expect(second).toMatchObject({
        status: "failed",
        errorMessage: "Hermes cron already succeeded for 2026-08-01. Previous run: " + first.cronRun.id + "."
      });
      expect(sendSlackWebhook).toHaveBeenCalledTimes(1);
      expect(store.findSuccessfulCronRun(createHermesCronIdempotencyKey("2026-08-01"))).toEqual(first.cronRun);
    } finally {
      db.close();
    }
  });

  it("returns a safe failed result when an active send claim already exists", async () => {
    const { db, store } = openInitializedStore();
    const sendSlackWebhook = vi.fn();

    try {
      const activeRun = store.createCronRun({
        idempotencyKey: createHermesCronIdempotencyKey("2026-08-01"),
        reportDate: "2026-08-01",
        mode: "send",
        startedAt: "2026-08-01T00:00:00.000Z",
        stepName: "started"
      });
      const result = await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "send",
        cacheRoot: tempCacheRoot(),
        webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
        sendSlackWebhook,
        fetcher: async () => sourceResponse(),
        now: fixedNow
      });

      expect(result).toMatchObject({
        status: "failed",
        cronRun: activeRun,
        errorMessage: "Hermes cron is already running for 2026-08-01. Active run: " + activeRun.id + "."
      });
      expect(sendSlackWebhook).not.toHaveBeenCalled();
    } finally {
      db.close();
    }
  });

  it("redacts encoded webhook secrets from cron failure messages", async () => {
    const { db, store } = openInitializedStore();

    try {
      const result = await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "send",
        cacheRoot: tempCacheRoot(),
        webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
        sendSlackWebhook: async () => {
          throw new Error("failed https%3A%2F%2Fhooks.slack.com%2Fservices%2FT000%2FB000%2Fsecret token=abc");
        },
        fetcher: async () => sourceResponse(),
        now: fixedNow
      });

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toContain("https%3A%2F%2Fhooks.slack.com%2Fservices%2F[redacted]");
      expect(result.errorMessage).toContain("token=[redacted]");
      expect(result.errorMessage).not.toContain("T000");
      expect(result.errorMessage).not.toContain("abc");
    } finally {
      db.close();
    }
  });

  it("allows send after repeated dry-runs for the same report date", async () => {
    const { db, store } = openInitializedStore();
    const now = sequentialNow();
    const sendSlackWebhook = vi.fn(async (input) => ({
      ok: true,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 200,
      errorMessage: null,
      sentAt: "2026-08-01T00:00:00.000Z",
      payloadHash: createPayloadHash(JSON.stringify(input.payload))
    }));

    try {
      await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "dry_run",
        cacheRoot: tempCacheRoot(),
        fetcher: async () => sourceResponse(),
        now
      });
      await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "dry_run",
        cacheRoot: tempCacheRoot(),
        fetcher: async () => sourceResponse(),
        now
      });
      const send = await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "send",
        cacheRoot: tempCacheRoot(),
        webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
        sendSlackWebhook,
        fetcher: async () => sourceResponse(),
        now
      });

      expect(send.status).toBe("success");
      expect(sendSlackWebhook).toHaveBeenCalledTimes(1);
    } finally {
      db.close();
    }
  });

  it("records missing webhook as a failed retryable cron run", async () => {
    const { db, store } = openInitializedStore();

    try {
      const result = await runHermesCron({
        store,
        sources: [sourceConfig()],
        reportDate: "2026-08-01",
        mode: "send",
        cacheRoot: tempCacheRoot(),
        fetcher: async () => sourceResponse(),
        now: fixedNow
      });

      expect(result).toMatchObject({
        status: "failed",
        errorMessage: "Missing required environment variable: SLACK_WEBHOOK_URL"
      });
      expect(result.cronRun).toMatchObject({
        status: "failed",
        stepName: "failed"
      });
      expect(store.findSuccessfulCronRun(createHermesCronIdempotencyKey("2026-08-01"))).toBeNull();
    } finally {
      db.close();
    }
  });
});

function openInitializedStore() {
  const db = openSqliteDatabase(":memory:");
  const store = createLlmWikiStore(db);
  store.initialize();
  return { db, store };
}

function sourceConfig(): NormalizedSourceConfig {
  return {
    id: "fixture-feed",
    name: "Fixture Feed",
    type: "atom",
    url: "https://example.com/feed.atom",
    category: "llm_vendor",
    credibility: "official",
    enabled: true,
    priority: 5,
    tags: ["ai"],
    official: true,
    parserType: "atom_parser",
    timezone: "UTC",
    rateLimit: {
      requestsPerMinute: 12
    },
    retry: {
      maxAttempts: 1,
      backoffMs: 0
    },
    fetchConfig: {
      timeoutMs: 5000,
      maxItemsPerFetch: 10,
      cacheTtlMinutes: 0
    },
    canonicalizationRules: {
      removeQueryParams: [],
      stripFragment: true,
      stripTrailingSlash: true,
      forceHttps: true
    }
  };
}

function sourceResponse() {
  return {
    status: 200,
    headers: {
      "content-type": "application/atom+xml"
    },
    body: [
      "<feed>",
      "<entry>",
      "<title>Hermes cron model API release</title>",
      "<link href=\"https://example.com/hermes-cron-model-api\" />",
      "<published>2026-07-31T16:00:00Z</published>",
      "<summary>Official model API release for Hermes cron.</summary>",
      "</entry>",
      "</feed>"
    ].join("")
  };
}

function tempCacheRoot(): string {
  return join(mkdtempSync(join(tmpdir(), "hermes-cron-cache-")), "cache");
}

function fixedNow(): Date {
  return new Date("2026-08-01T00:00:00.000Z");
}

function sequentialNow(): () => Date {
  let index = 0;
  return () => {
    const date = new Date(`2026-08-01T00:00:0${index}.000Z`);
    index = Math.min(index + 1, 9);
    return date;
  };
}
