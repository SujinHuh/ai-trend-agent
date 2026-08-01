import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runCli(command: string, args: string[] = []) {
  return execFileAsync("node", ["--import", "tsx", "src/cli.ts", command, ...args], {
    cwd: process.cwd()
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
});
