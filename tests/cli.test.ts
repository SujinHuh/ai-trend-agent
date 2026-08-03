import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import type { SlackWebhookPayload } from "../src/domain/types.js";
import { runCliCommand } from "../src/cli.js";
import { createPayloadHash } from "../src/slack/slack-webhook.js";

const execFileAsync = promisify(execFile);
const originalAllowExternalPaths = process.env.AI_TREND_ALLOW_EXTERNAL_PATHS;

beforeAll(() => {
  process.env.AI_TREND_ALLOW_EXTERNAL_PATHS = "true";
});

afterAll(() => {
  if (originalAllowExternalPaths === undefined) {
    delete process.env.AI_TREND_ALLOW_EXTERNAL_PATHS;
  } else {
    process.env.AI_TREND_ALLOW_EXTERNAL_PATHS = originalAllowExternalPaths;
  }
});

async function runCli(command: string, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return execFileAsync("node", ["--import", "tsx", "src/cli.ts", command, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AI_TREND_ALLOW_EXTERNAL_PATHS: "true",
      ...env
    }
  });
}

describe("CLI", () => {
  it("initializes, seeds, and reads a sample digest from an isolated SQLite file", async () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "llm-wiki-cli-")), "wiki.sqlite");

    const init = await runCli("db:init", [`--db=${dbPath}`]);
    expect(init.stdout).toContain("Initialized LLM Wiki database");

    const seed = await runCli("sample:seed", [`--db=${dbPath}`]);
    const seedResult = JSON.parse(seed.stdout) as {
      digestId: string;
      reportDate: string;
      itemCount: number;
    };
    expect(seedResult).toMatchObject({
      digestId: "digest_2026-07-29",
      reportDate: "2026-07-29",
      itemCount: 2
    });

    const digest = await runCli("digest:get", [`--db=${dbPath}`, "--date=2026-07-29"]);
    const digestResult = JSON.parse(digest.stdout) as {
      digest: { id: string; reportDate: string };
      items: Array<{ id: string; evidence: unknown[] }>;
    };

    expect(digestResult.digest).toMatchObject({
      id: "digest_2026-07-29",
      reportDate: "2026-07-29"
    });
    expect(digestResult.items).toHaveLength(2);
    expect(digestResult.items.every((item) => item.evidence.length === 1)).toBe(true);
  }, 30000);

  it("prints a null digest payload for a missing report date", async () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "llm-wiki-cli-")), "wiki.sqlite");

    await runCli("db:init", [`--db=${dbPath}`]);
    const result = await runCli("digest:get", [`--db=${dbPath}`, "--date=2026-07-30"]);

    expect(JSON.parse(result.stdout)).toEqual({
      reportDate: "2026-07-30",
      digest: null
    });
  }, 30000);

  it("validates source config and runs ingestion from a cached source snapshot", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "source-ingest-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const cacheRoot = join(tempDir, "cache");
    const configPath = join(tempDir, "sources.json");
    const reportDate = "2026-08-01";

    writeFileSync(
      configPath,
      JSON.stringify([
        {
          id: "fixture-feed",
          name: "Fixture Feed",
          type: "atom",
          url: "https://example.com/feed.atom",
          category: "llm_vendor",
          credibility: "official",
          enabled: true,
          priority: 1,
          tags: ["ai"],
          fetchConfig: {
            timeoutMs: 5000,
            maxItemsPerFetch: 10,
            cacheTtlMinutes: 1000000
          }
        }
      ])
    );

    const cacheDir = join(cacheRoot, reportDate);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(
      join(cacheDir, "fixture-feed.json"),
      JSON.stringify({
        sourceId: "fixture-feed",
        fetchedAt: new Date().toISOString(),
        status: 200,
        headers: {
          "content-type": "application/atom+xml"
        },
        body: [
          "<feed>",
          "<entry>",
          "<title>Cached AI update</title>",
          "<link href=\"https://example.com/cached-ai-update?utm_source=feed\" />",
          "<published>2026-07-31T16:00:00Z</published>",
          "<summary>Cached source evidence.</summary>",
          "</entry>",
          "</feed>"
        ].join("")
      })
    );

    const validation = await runCli("sources:validate", [`--config=${configPath}`]);
    expect(JSON.parse(validation.stdout)).toMatchObject({
      sourceCount: 1,
      enabledSourceCount: 1,
      enabledSourceIds: ["fixture-feed"]
    });

    const ingestion = await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);
    const ingestionResult = JSON.parse(ingestion.stdout) as {
      insertedOrUpdatedCount: number;
      failedSourceCount: number;
      sourceResults: Array<{ cacheHit: boolean }>;
    };

    expect(ingestionResult.insertedOrUpdatedCount).toBe(1);
    expect(ingestionResult.failedSourceCount).toBe(0);
    expect(ingestionResult.sourceResults[0]?.cacheHit).toBe(true);
  }, 30000);

  it("passes enabled domain filtering into ingestion", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "source-domain-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const cacheRoot = join(tempDir, "cache");
    const configPath = join(tempDir, "sources.json");
    const reportDate = "2026-08-01";
    writeFileSync(
      configPath,
      JSON.stringify([
        cliSource("ai-feed", "AI Feed", "ai"),
        cliSource("backend-feed", "Backend Feed", "backend")
      ])
    );
    const cacheDir = join(cacheRoot, reportDate);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, "ai-feed.json"), JSON.stringify(cachedFeed("ai-feed", "AI update")));
    writeFileSync(join(cacheDir, "backend-feed.json"), JSON.stringify(cachedFeed("backend-feed", "Backend update")));

    const defaultRun = await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);
    const defaultResult = JSON.parse(defaultRun.stdout) as { sourceResults: Array<{ sourceId: string }> };
    expect(defaultResult.sourceResults.map((source) => source.sourceId)).toEqual(["ai-feed"]);

    const expandedRun = await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`,
      "--domains=ai,backend"
    ]);
    const expandedResult = JSON.parse(expandedRun.stdout) as { sourceResults: Array<{ sourceId: string }> };
    expect(expandedResult.sourceResults.map((source) => source.sourceId)).toEqual(["backend-feed", "ai-feed"]);
  }, 30000);

  it("uses injectable env ENABLED_DOMAINS when running CLI commands in-process", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "source-domain-env-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const cacheRoot = join(tempDir, "cache");
    const configPath = join(tempDir, "sources.json");
    const reportDate = "2026-08-01";
    const stdout: string[] = [];
    writeFileSync(
      configPath,
      JSON.stringify([
        cliSource("ai-feed", "AI Feed", "ai"),
        cliSource("backend-feed", "Backend Feed", "backend")
      ])
    );
    const cacheDir = join(cacheRoot, reportDate);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, "ai-feed.json"), JSON.stringify(cachedFeed("ai-feed", "AI update")));
    writeFileSync(join(cacheDir, "backend-feed.json"), JSON.stringify(cachedFeed("backend-feed", "Backend update")));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation((value) => {
      stdout.push(String(value));
    });
    try {
      await runCliCommand(
        ["ingest:run", `--config=${configPath}`, `--db=${dbPath}`, `--cache-root=${cacheRoot}`, `--date=${reportDate}`],
        {
          env: {
            ENABLED_DOMAINS: "ai,backend"
          }
        }
      );

      const parsed = JSON.parse(stdout[0] ?? "{}") as { sourceResults: Array<{ sourceId: string }> };
      expect(parsed.sourceResults.map((source) => source.sourceId)).toEqual(["backend-feed", "ai-feed"]);
    } finally {
      consoleSpy.mockRestore();
    }
  }, 30000);

  it("passes enabled domain filtering into cron dry-run", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "source-domain-cron-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const cacheRoot = join(tempDir, "cache");
    const configPath = join(tempDir, "sources.json");
    const reportDate = "2026-08-01";
    writeFileSync(
      configPath,
      JSON.stringify([
        cliSource("ai-feed", "AI Feed", "ai"),
        cliSource("backend-feed", "Backend Feed", "backend")
      ])
    );
    const cacheDir = join(cacheRoot, reportDate);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, "ai-feed.json"), JSON.stringify(cachedFeed("ai-feed", "AI update")));
    writeFileSync(join(cacheDir, "backend-feed.json"), JSON.stringify(cachedFeed("backend-feed", "Backend update")));

    const defaultRun = await runCli("cron:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`,
      "--dry-run"
    ]);
    expect(JSON.parse(defaultRun.stdout)).toMatchObject({ candidateCount: 1 });

    const expandedRun = await runCli("cron:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`,
      "--dry-run",
      "--force",
      "--domains=ai,backend"
    ]);
    expect(JSON.parse(expandedRun.stdout)).toMatchObject({ candidateCount: 2 });
  }, 30000);

  it("generates digest candidates from cached ingestion output", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "digest-candidates-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const cacheRoot = join(tempDir, "cache");
    const configPath = join(tempDir, "sources.json");
    const reportDate = "2026-08-01";

    writeFileSync(
      configPath,
      JSON.stringify([
        {
          id: "fixture-feed",
          name: "Fixture Feed",
          type: "atom",
          url: "https://example.com/feed.atom",
          category: "llm_vendor",
          credibility: "official",
          enabled: true,
          priority: 5,
          tags: ["ai", "model"],
          fetchConfig: {
            timeoutMs: 5000,
            maxItemsPerFetch: 10,
            cacheTtlMinutes: 1000000
          }
        }
      ])
    );

    const cacheDir = join(cacheRoot, reportDate);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(
      join(cacheDir, "fixture-feed.json"),
      JSON.stringify({
        sourceId: "fixture-feed",
        fetchedAt: new Date().toISOString(),
        status: 200,
        headers: {
          "content-type": "application/atom+xml"
        },
        body: [
          "<feed>",
          "<entry>",
          "<title>New model API release</title>",
          "<link href=\"https://example.com/new-model-api\" />",
          "<published>2026-07-31T16:00:00Z</published>",
          "<summary>Official model API release for coding agents.</summary>",
          "</entry>",
          "</feed>"
        ].join("")
      })
    );

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const result = await runCli("digest:candidates", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--date=${reportDate}`,
      "--limit=5"
    ]);
    const parsed = JSON.parse(result.stdout) as {
      reportDate: string;
      assessedCount: number;
      candidateCount: number;
      candidates: Array<{
        title: string;
        actionLevel: string;
        confirmationStatus: string;
        lineage: unknown[];
      }>;
    };

    expect(parsed).toMatchObject({
      reportDate,
      assessedCount: 1,
      candidateCount: 1
    });
    expect(parsed.candidates[0]).toMatchObject({
      title: "New model API release",
      actionLevel: "do_now",
      confirmationStatus: "official_only"
    });
    expect(parsed.candidates[0]?.lineage).toHaveLength(1);
  }, 30000);

  it("runs synthesis for wiki query and index commands", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "wiki-query-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const cacheRoot = join(tempDir, "cache");
    const configPath = join(tempDir, "sources.json");
    const indexPath = join(tempDir, "index.md");
    const reportDate = "2026-08-01";

    writeFileSync(
      configPath,
      JSON.stringify([
        {
          id: "fixture-feed",
          name: "Fixture Feed",
          type: "atom",
          url: "https://example.com/feed.atom",
          category: "llm_vendor",
          credibility: "official",
          enabled: true,
          priority: 5,
          tags: ["ai"],
          fetchConfig: {
            timeoutMs: 5000,
            maxItemsPerFetch: 10,
            cacheTtlMinutes: 1000000
          }
        }
      ])
    );

    const cacheDir = join(cacheRoot, reportDate);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(
      join(cacheDir, "fixture-feed.json"),
      JSON.stringify({
        sourceId: "fixture-feed",
        fetchedAt: new Date().toISOString(),
        status: 200,
        headers: {
          "content-type": "application/atom+xml"
        },
        body: [
          "<feed>",
          "<entry>",
          "<title>Agent workflow launch</title>",
          "<link href=\"https://example.com/agent-workflow\" />",
          "<published>2026-07-31T16:00:00Z</published>",
          "<summary>Official agent workflow launch.</summary>",
          "</entry>",
          "</feed>"
        ].join("")
      })
    );

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const query = await runCli("wiki:query", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--date=${reportDate}`,
      "--limit=5"
    ]);

    expect(JSON.parse(query.stdout)).toMatchObject({
      reportDate,
      itemCount: 1
    });

    const index = await runCli("wiki:index", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--date=${reportDate}`,
      `--out=${indexPath}`
    ]);

    expect(JSON.parse(index.stdout)).toMatchObject({
      reportDate,
      outPath: indexPath,
      itemCount: 1
    });
  }, 30000);

  it("previews Slack payload without a webhook URL", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const preview = await runCli("slack:preview", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--date=${reportDate}`,
      "--limit=5"
    ]);
    const parsed = JSON.parse(preview.stdout) as {
      mode: string;
      candidateCount: number;
      payload: { text: string };
    };

    expect(parsed).toMatchObject({
      mode: "preview",
      candidateCount: 1
    });
    expect(parsed.payload.text).toBe(`AI Trend Daily Digest - ${reportDate}`);
  }, 30000);

  it("does not use global fetch during Slack preview", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn(() => {
      throw new Error("preview must not fetch");
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await runCliCommand([
        "slack:preview",
        `--config=${configPath}`,
        `--db=${dbPath}`,
        `--date=${reportDate}`,
        "--limit=5"
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  }, 30000);

  it("enables injectable LLM digest enrichment for Slack preview only when requested", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const stdout: string[] = [];
    const provider = {
      providerName: "fake",
      modelName: "fake-digest",
      generateDigestIntelligence: vi.fn(async (request: { candidates: Array<{ trendItemId: string }> }) => ({
        rawText: JSON.stringify({
          items: [
            {
              trendItemId: request.candidates[0]?.trendItemId,
              summary: "LLM CLI summary",
              whyItMatters: "LLM CLI why",
              practicalImpact: "LLM CLI impact",
              importanceScore: 88,
              actionLevel: "do_now"
            }
          ]
        }),
        usage: {
          inputTokens: 50,
          outputTokens: 20
        }
      }))
    };

    await runCliCommand(
      ["slack:preview", `--config=${configPath}`, `--db=${dbPath}`, `--date=${reportDate}`, "--limit=5", "--llm-digest"],
      {
        llmDigestProvider: provider,
        stdout: (value) => stdout.push(value)
      }
    );

    expect(provider.generateDigestIntelligence).toHaveBeenCalledTimes(1);
    expect(stdout.join("\n")).toContain("LLM CLI summary");
  }, 30000);

  it("refuses Slack send without SLACK_WEBHOOK_URL before network", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    await expect(
      runCli("slack:send", [
        `--config=${configPath}`,
        `--db=${dbPath}`,
        `--date=${reportDate}`,
        "--limit=5"
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("SLACK_WEBHOOK_URL")
    });
  }, 30000);

  it("records a successful Slack delivery attempt through an injectable sender", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const stdout: string[] = [];
    let payloadHash = "";
    const sendSlackWebhook = vi.fn(async (input: { webhookUrl: string; payload: SlackWebhookPayload }) => {
      expect(input.webhookUrl).toBe("https://hooks.slack.com/services/T000/B000/secret");
      expect(input.payload.text).toBe(`AI Trend Daily Digest - ${reportDate}`);
      payloadHash = createPayloadHash(JSON.stringify(input.payload));

      return {
        ok: true,
        webhookHost: "hooks.slack.com",
        httpStatusCode: 200,
        errorMessage: null,
        sentAt: "2026-08-02T00:00:00.000Z",
        payloadHash
      };
    });

    await runCliCommand(
      ["slack:send", `--config=${configPath}`, `--db=${dbPath}`, `--date=${reportDate}`, "--limit=5"],
      {
        env: {
          SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/secret"
        },
        sendSlackWebhook,
        stdout: (value) => stdout.push(value)
      }
    );

    expect(sendSlackWebhook).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stdout[0] ?? "{}")).toMatchObject({
      reportDate,
      sent: true,
      attempt: {
        reportDate,
        webhookHost: "hooks.slack.com",
        status: "success",
        httpStatusCode: 200,
        errorMessage: null,
        payloadHash
      }
    });

    const db = openSqliteDatabase(dbPath);
    const store = createLlmWikiStore(db);

    try {
      const attempts = store.listSlackDeliveryAttempts(reportDate);
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        reportDate,
        webhookHost: "hooks.slack.com",
        status: "success",
        httpStatusCode: 200,
        errorMessage: null,
        payloadHash
      });
    } finally {
      db.close();
    }
  }, 30000);

  it("refuses to resend an identical successful Slack payload without --force-send", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const sendSlackWebhook = vi.fn(async (input: { webhookUrl: string; payload: SlackWebhookPayload }) => ({
      ok: true,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 200,
      errorMessage: null,
      sentAt: "2026-08-02T00:00:00.000Z",
      payloadHash: createPayloadHash(JSON.stringify(input.payload))
    }));
    const dependencies = {
      env: {
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/secret"
      },
      sendSlackWebhook,
      stdout: vi.fn()
    };

    await runCliCommand(
      ["slack:send", `--config=${configPath}`, `--db=${dbPath}`, `--date=${reportDate}`, "--limit=5"],
      dependencies
    );
    await expect(
      runCliCommand(
        ["slack:send", `--config=${configPath}`, `--db=${dbPath}`, `--date=${reportDate}`, "--limit=5"],
        dependencies
      )
    ).rejects.toThrow("Slack digest already sent");

    expect(sendSlackWebhook).toHaveBeenCalledTimes(1);
  }, 30000);

  it("allows an identical successful Slack payload when --force-send is explicit", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    const sendSlackWebhook = vi.fn(async (input: { webhookUrl: string; payload: SlackWebhookPayload }) => ({
      ok: true,
      webhookHost: "hooks.slack.com",
      httpStatusCode: 200,
      errorMessage: null,
      sentAt: `2026-08-02T00:00:0${sendSlackWebhook.mock.calls.length}.000Z`,
      payloadHash: createPayloadHash(JSON.stringify(input.payload))
    }));
    const dependencies = {
      env: {
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/secret"
      },
      sendSlackWebhook,
      stdout: vi.fn()
    };

    await runCliCommand(
      ["slack:send", `--config=${configPath}`, `--db=${dbPath}`, `--date=${reportDate}`, "--limit=5"],
      dependencies
    );
    await runCliCommand(
      [
        "slack:send",
        `--config=${configPath}`,
        `--db=${dbPath}`,
        `--date=${reportDate}`,
        "--limit=5",
        "--force-send"
      ],
      dependencies
    );

    expect(sendSlackWebhook).toHaveBeenCalledTimes(2);
  }, 30000);

  it("records a failed Slack delivery attempt for an invalid webhook URL without network", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();

    await runCli("ingest:run", [
      `--config=${configPath}`,
      `--db=${dbPath}`,
      `--cache-root=${cacheRoot}`,
      `--date=${reportDate}`
    ]);

    await expect(
      runCli(
        "slack:send",
        [`--config=${configPath}`, `--db=${dbPath}`, `--date=${reportDate}`, "--limit=5"],
        {
          SLACK_WEBHOOK_URL: "not-a-url"
        }
      )
    ).rejects.toMatchObject({
      stdout: expect.stringContaining("\"sent\": false"),
      stderr: ""
    });

    const db = openSqliteDatabase(dbPath);
    const store = createLlmWikiStore(db);

    try {
      const attempts = store.listSlackDeliveryAttempts(reportDate);
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        reportDate,
        webhookHost: "invalid",
        status: "failed",
        httpStatusCode: null,
        errorMessage: "SLACK_WEBHOOK_URL must be a valid URL"
      });
    } finally {
      db.close();
    }
  }, 30000);

  it("runs Hermes cron dry-run without a Slack webhook URL", async () => {
    const { dbPath, configPath, cacheRoot, reportDate } = await prepareSingleCandidateFixture();
    const stdout: string[] = [];

    await runCliCommand(
      [
        "cron:run",
        `--config=${configPath}`,
        `--db=${dbPath}`,
        `--cache-root=${cacheRoot}`,
        `--date=${reportDate}`,
        "--dry-run"
      ],
      {
        stdout: (value) => stdout.push(value)
      }
    );
    const parsed = JSON.parse(stdout[0] ?? "{}") as {
      mode: string;
      status: string;
      candidateCount: number;
      payload: { text: string };
    };

    expect(parsed).toMatchObject({
      mode: "dry_run",
      status: "success",
      candidateCount: 1
    });
    expect(parsed.payload.text).toBe(`AI Trend Daily Digest - ${reportDate}`);
  }, 30000);

  it("validates social sources, imports manual public JSONL, and lists social signals", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "social-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const socialConfigPath = join(tempDir, "social.json");
    const inputPath = join(tempDir, "manual.jsonl");

    writeFileSync(
      socialConfigPath,
      JSON.stringify([
        {
          id: "manual-public-ai-links",
          platform: "manual",
          displayName: "Manual public AI links",
          credibility: "trusted_individual",
          collectionMethod: "manual_export",
          enabled: false,
          defaultConfirmationStatus: "needs_confirmation",
          handles: [],
          accountIds: [],
          subreddits: [],
          keywords: ["ai"],
          officialDomainsToConfirm: ["openai.com"],
          rateLimit: { maxRequestsPerWindow: 1, windowSeconds: 60 },
          livePolling: {
            pollingIntervalMinutes: 1440,
            cacheTtlMinutes: 1440,
            timeoutMs: 5000,
            maxItemsPerFetch: 10,
            retryCount: 0,
            backoffMs: 0
          },
          security: { requiresToken: false },
          policyReviewedAt: "2026-08-02",
          policyNotes: "public links only"
        }
      ])
    );
    writeFileSync(
      inputPath,
      JSON.stringify({
        sourceId: "manual-public-ai-links",
        url: "https://example.com/public-ai-signal",
        text: "Public AI signal https://openai.com/news/example",
        provenance: "public export"
      })
    );

    const validation = await runCli("social:validate", [`--social-config=${socialConfigPath}`]);
    expect(JSON.parse(validation.stdout)).toMatchObject({
      sourceCount: 1,
      enabledSourceCount: 0
    });

    const imported = await runCli("social:import", [
      `--db=${dbPath}`,
      `--social-config=${socialConfigPath}`,
      "--source-id=manual-public-ai-links",
      `--input=${inputPath}`
    ]);
    expect(JSON.parse(imported.stdout)).toMatchObject({
      sourceId: "manual-public-ai-links",
      importedCount: 1
    });

    const listed = await runCli("social:list", [`--db=${dbPath}`]);
    expect(JSON.parse(listed.stdout)).toMatchObject({
      itemCount: 1,
      items: [
        {
          sourceId: "manual-public-ai-links",
          confirmationStatus: "needs_confirmation"
        }
      ]
    });
  }, 30000);

  it("runs social poll dry-run for an enabled Reddit RSS source", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "social-poll-cli-"));
    const dbPath = join(tempDir, "wiki.sqlite");
    const socialConfigPath = join(tempDir, "social.json");
    const cacheRoot = join(tempDir, "cache");
    const stdout: string[] = [];

    writeFileSync(
      socialConfigPath,
      JSON.stringify([
        {
          id: "reddit-local-llama",
          platform: "reddit",
          displayName: "Reddit LocalLLaMA RSS",
          credibility: "community",
          collectionMethod: "rss",
          enabled: true,
          defaultConfirmationStatus: "needs_confirmation",
          handles: [],
          accountIds: [],
          subreddits: ["LocalLLaMA"],
          keywords: ["llm"],
          officialDomainsToConfirm: ["openai.com"],
          rateLimit: { maxRequestsPerWindow: 12, windowSeconds: 60 },
          livePolling: {
            pollingIntervalMinutes: 60,
            cacheTtlMinutes: 30,
            timeoutMs: 5000,
            maxItemsPerFetch: 5,
            retryCount: 0,
            backoffMs: 0
          },
          security: { requiresToken: false },
          policyReviewedAt: "2026-08-02",
          policyNotes: "rss only"
        }
      ])
    );

    await runCliCommand(
      [
        "social:poll",
        `--db=${dbPath}`,
        `--social-config=${socialConfigPath}`,
        `--cache-root=${cacheRoot}`,
        "--date=2026-08-03",
        "--dry-run"
      ],
      {
        fetcher: async () => ({
          status: 200,
          headers: { "content-type": "application/atom+xml" },
          body: [
            "<feed>",
            "<entry>",
            "<title>LLM model discussion</title>",
            "<author><name>reddit_user</name></author>",
            "<updated>2026-08-03T00:00:00Z</updated>",
            "<link href=\"https://www.reddit.com/r/LocalLLaMA/comments/cli\" />",
            "<content>Community-only LLM signal</content>",
            "</entry>",
            "</feed>"
          ].join("")
        }),
        stdout: (value) => stdout.push(value)
      }
    );

    expect(JSON.parse(stdout[0] ?? "{}")).toMatchObject({
      reportDate: "2026-08-03",
      dryRun: true,
      sourceCount: 1,
      polledSourceCount: 1,
      savedCount: 0,
      results: [
        {
          sourceId: "reddit-local-llama",
          normalizedCount: 1,
          savedCount: 0,
          items: [{ confirmationStatus: "needs_confirmation" }]
        }
      ]
    });
  }, 30000);
});

async function prepareSingleCandidateFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), "slack-cli-"));
  const dbPath = join(tempDir, "wiki.sqlite");
  const cacheRoot = join(tempDir, "cache");
  const configPath = join(tempDir, "sources.json");
  const reportDate = "2026-08-01";

  writeFileSync(
    configPath,
    JSON.stringify([
      {
        id: "fixture-feed",
        name: "Fixture Feed",
        type: "atom",
        url: "https://example.com/feed.atom",
        category: "llm_vendor",
        credibility: "official",
        enabled: true,
        priority: 5,
        tags: ["ai"],
        fetchConfig: {
          timeoutMs: 5000,
          maxItemsPerFetch: 10,
          cacheTtlMinutes: 1000000
        }
      }
    ])
  );

  const cacheDir = join(cacheRoot, reportDate);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    join(cacheDir, "fixture-feed.json"),
    JSON.stringify({
      sourceId: "fixture-feed",
      fetchedAt: new Date().toISOString(),
      status: 200,
      headers: {
        "content-type": "application/atom+xml"
      },
      body: [
        "<feed>",
        "<entry>",
        "<title>Slack model API release</title>",
        "<link href=\"https://example.com/slack-model-api\" />",
        "<published>2026-07-31T16:00:00Z</published>",
        "<summary>Official model API release for Slack preview.</summary>",
        "</entry>",
        "</feed>"
      ].join("")
    })
  );

  return { dbPath, configPath, cacheRoot, reportDate };
}

function cliSource(id: string, name: string, domain: string) {
  return {
    id,
    name,
    type: "atom",
    url: `https://example.com/${id}.atom`,
    domain,
    category: "developer_tool",
    credibility: "official",
    enabled: true,
    priority: domain === "ai" ? 5 : 10,
    tags: [domain],
    fetchConfig: {
      timeoutMs: 5000,
      maxItemsPerFetch: 10,
      cacheTtlMinutes: 1000000
    }
  };
}

function cachedFeed(sourceId: string, title: string) {
  return {
    sourceId,
    fetchedAt: new Date().toISOString(),
    status: 200,
    headers: {
      "content-type": "application/atom+xml"
    },
    body: [
      "<feed>",
      "<entry>",
      `<title>${title}</title>`,
      `<link href="https://example.com/${sourceId}/update" />`,
      "<published>2026-07-31T16:00:00Z</published>",
      `<summary>${title} evidence.</summary>`,
      "</entry>",
      "</feed>"
    ].join("")
  };
}
