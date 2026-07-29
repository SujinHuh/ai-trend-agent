import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
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
  }, 15000);

  it("prints a null digest payload for a missing report date", async () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "llm-wiki-cli-")), "wiki.sqlite");

    await runCli("db:init", [`--db=${dbPath}`]);
    const result = await runCli("digest:get", [`--db=${dbPath}`, "--date=2026-07-30"]);

    expect(JSON.parse(result.stdout)).toEqual({
      reportDate: "2026-07-30",
      digest: null
    });
  }, 15000);
});
