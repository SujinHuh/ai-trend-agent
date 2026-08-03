import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { createConsistentWikiSnapshot } from "../src/deployment/create-wiki-snapshot.js";

describe("GCE news SQLite snapshot", () => {
  it("uses online backup to include committed WAL data and passes integrity_check", async () => {
    const directory = mkdtempSync(join(tmpdir(), "news-snapshot-"));
    const sourcePath = join(directory, "source.sqlite");
    const snapshotPath = join(directory, "snapshot.sqlite");
    const writer = new Database(sourcePath);
    writer.pragma("journal_mode = WAL");
    writer.pragma("wal_autocheckpoint = 0");
    writer.exec("CREATE TABLE digest_marker (report_date TEXT PRIMARY KEY)");
    writer.prepare("INSERT INTO digest_marker (report_date) VALUES (?)").run("2026-08-03");

    await createConsistentWikiSnapshot(sourcePath, snapshotPath);

    const snapshot = new Database(snapshotPath, { readonly: true, fileMustExist: true });
    expect(snapshot.prepare("SELECT report_date FROM digest_marker").pluck().all()).toEqual(["2026-08-03"]);
    expect(snapshot.pragma("integrity_check", { simple: true })).toBe("ok");
    snapshot.close();
    writer.close();
  });

  it("fails without creating a valid result for a missing source", async () => {
    const directory = mkdtempSync(join(tmpdir(), "news-snapshot-missing-"));
    await expect(
      createConsistentWikiSnapshot(join(directory, "missing.sqlite"), join(directory, "snapshot.sqlite"))
    ).rejects.toThrow();
  });
});
