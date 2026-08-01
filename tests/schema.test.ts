import { describe, expect, it } from "vitest";

import { initializeSchema } from "../src/db/schema.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";

function openTestDatabase() {
  const db = openSqliteDatabase(":memory:");
  initializeSchema(db);
  return db;
}

describe("SQLite schema", () => {
  it("creates the required Task 001 tables", () => {
    const db = openTestDatabase();

    const tables = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name IN ('trend_items', 'digests', 'source_evidence', 'digest_trend_items')
          ORDER BY name
        `
      )
      .pluck()
      .all();

    expect(tables).toEqual([
      "digest_trend_items",
      "digests",
      "source_evidence",
      "trend_items"
    ]);
    db.close();
  });

  it("prevents duplicate trend items by canonical URL and canonical hash", () => {
    const db = openTestDatabase();

    const insert = db.prepare(`
      INSERT INTO trend_items (
        id,
        canonical_url,
        canonical_hash,
        title,
        source_name,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      "trend_one",
      "https://example.com/news",
      "hash_one",
      "Example",
      "Example Source",
      null
    );

    expect(() =>
      insert.run(
        "trend_two",
        "https://example.com/news",
        "hash_two",
        "Duplicate URL",
        "Example Source",
        null
      )
    ).toThrow(/UNIQUE constraint failed: trend_items\.canonical_url/);

    expect(() =>
      insert.run(
        "trend_three",
        "https://example.com/other",
        "hash_one",
        "Duplicate Hash",
        "Example Source",
        null
      )
    ).toThrow(/UNIQUE constraint failed: trend_items\.canonical_hash/);

    db.close();
  });

  it("stores digest membership and source evidence with foreign keys", () => {
    const db = openTestDatabase();

    db.prepare(
      `
        INSERT INTO trend_items (
          id,
          canonical_url,
          canonical_hash,
          title,
          source_name,
          published_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(
      "trend_one",
      "https://example.com/news",
      "hash_one",
      "Example",
      "Example Source",
      "2026-07-29T00:00:00.000Z"
    );

    db.prepare(
      `
        INSERT INTO digests (id, report_date, timezone, generated_at)
        VALUES (?, ?, ?, ?)
      `
    ).run(
      "digest_2026-07-29",
      "2026-07-29",
      "Asia/Seoul",
      "2026-07-29T22:00:00.000Z"
    );

    db.prepare(
      `
        INSERT INTO digest_trend_items (digest_id, trend_item_id, position)
        VALUES (?, ?, ?)
      `
    ).run("digest_2026-07-29", "trend_one", 1);

    db.prepare(
      `
        INSERT INTO source_evidence (
          id,
          trend_item_id,
          source_url,
          source_name,
          fetched_at,
          evidence_excerpt,
          confidence_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "evidence_one",
      "trend_one",
      "https://example.com/news",
      "Example Source",
      "2026-07-29T21:55:00.000Z",
      "Example excerpt",
      0.8
    );

    const rows = db
      .prepare(
        `
          SELECT
            d.report_date AS reportDate,
            t.id AS trendItemId,
            se.id AS evidenceId
          FROM digests d
          JOIN digest_trend_items dti ON dti.digest_id = d.id
          JOIN trend_items t ON t.id = dti.trend_item_id
          JOIN source_evidence se ON se.trend_item_id = t.id
          WHERE d.report_date = ?
        `
      )
      .all("2026-07-29");

    expect(rows).toEqual([
      {
        reportDate: "2026-07-29",
        trendItemId: "trend_one",
        evidenceId: "evidence_one"
      }
    ]);

    expect(() =>
      db
        .prepare(
          `
            INSERT INTO digest_trend_items (digest_id, trend_item_id, position)
            VALUES (?, ?, ?)
          `
        )
        .run("missing_digest", "trend_one", 2)
    ).toThrow(/FOREIGN KEY constraint failed/);

    db.close();
  });

  it("creates indexes for report date and join lookups", () => {
    const db = openTestDatabase();

    const indexes = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'index'
            AND name IN (
              'idx_digests_report_date',
              'idx_source_evidence_trend_item_id',
              'idx_source_evidence_fetched_at',
              'idx_digest_trend_items_trend_item_id'
            )
          ORDER BY name
        `
      )
      .pluck()
      .all();

    expect(indexes).toEqual([
      "idx_digest_trend_items_trend_item_id",
      "idx_digests_report_date",
      "idx_source_evidence_fetched_at",
      "idx_source_evidence_trend_item_id"
    ]);
    db.close();
  });
});
