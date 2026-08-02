import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { runCliCommand } from "../src/cli.js";

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
