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
            AND name IN (
              'trend_items',
              'digests',
              'source_evidence',
              'digest_trend_items',
              'trend_assessments',
              'trend_assessment_lineage'
            )
          ORDER BY name
        `
      )
      .pluck()
      .all();

    expect(tables).toEqual([
      "digest_trend_items",
      "digests",
      "source_evidence",
      "trend_assessment_lineage",
      "trend_assessments",
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
              'idx_digest_trend_items_trend_item_id',
              'idx_trend_assessments_report_date',
              'idx_trend_assessments_score',
              'idx_trend_assessment_lineage_assessment_id'
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
      "idx_source_evidence_trend_item_id",
      "idx_trend_assessment_lineage_assessment_id",
      "idx_trend_assessments_report_date",
      "idx_trend_assessments_score"
    ]);
    expect(db.pragma("user_version", { simple: true })).toBe(3);
    db.close();
  });

  it("upgrades a pre-Task-003 database with additive assessment tables", () => {
    const db = openSqliteDatabase(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE trend_items (
        id TEXT PRIMARY KEY,
        canonical_url TEXT NOT NULL UNIQUE,
        canonical_hash TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        source_name TEXT NOT NULL,
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE source_evidence (
        id TEXT PRIMARY KEY,
        trend_item_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_name TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        evidence_excerpt TEXT,
        confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        FOREIGN KEY (trend_item_id) REFERENCES trend_items(id) ON DELETE CASCADE
      );
    `);

    initializeSchema(db);

    const tables = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name IN ('trend_items', 'source_evidence', 'trend_assessments', 'trend_assessment_lineage')
          ORDER BY name
        `
      )
      .pluck()
      .all();

    expect(tables).toEqual([
      "source_evidence",
      "trend_assessment_lineage",
      "trend_assessments",
      "trend_items"
    ]);
    expect(db.pragma("user_version", { simple: true })).toBe(3);
    db.close();
  });

  it("stores trend assessments and source lineage with constraints", () => {
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
      "2026-07-31T16:00:00.000Z"
    );

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
      "2026-08-01T00:00:00.000Z",
      "Example excerpt",
      0.8
    );

    db.prepare(
      `
        INSERT INTO trend_assessments (
          id,
          trend_item_id,
          report_date,
          summary,
          why_it_matters,
          practical_impact,
          trend_category,
          action_level,
          confirmation_status,
          confidence,
          importance_score,
          staleness_policy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "assessment_one",
      "trend_one",
      "2026-08-01",
      "Summary",
      "Why",
      "Impact",
      "model",
      "do_next",
      "official_only",
      0.85,
      72,
      "Recheck later"
    );

    db.prepare(
      `
        INSERT INTO trend_assessment_lineage (
          assessment_id,
          source_evidence_id,
          source_name,
          source_url,
          confidence_score
        )
        VALUES (?, ?, ?, ?, ?)
      `
    ).run(
      "assessment_one",
      "evidence_one",
      "Example Source",
      "https://example.com/news",
      0.8
    );

    expect(() =>
      db
        .prepare(
          `
            INSERT INTO trend_assessments (
              id,
              trend_item_id,
              report_date,
              summary,
              why_it_matters,
              practical_impact,
              trend_category,
              action_level,
              confirmation_status,
              confidence,
              importance_score,
              staleness_policy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          "bad_assessment",
          "trend_one",
          "2026-08-02",
          "Summary",
          "Why",
          "Impact",
          "unknown",
          "do_next",
          "official_only",
          0.85,
          72,
          "Recheck later"
        )
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});
