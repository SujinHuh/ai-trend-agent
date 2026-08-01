import type { SqliteDatabase } from "./sqlite.js";

export function initializeSchema(db: SqliteDatabase): void {
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS trend_items (
      id TEXT PRIMARY KEY,
      canonical_url TEXT NOT NULL UNIQUE,
      canonical_hash TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      source_name TEXT NOT NULL,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS digests (
      id TEXT PRIMARY KEY,
      report_date TEXT NOT NULL UNIQUE,
      timezone TEXT NOT NULL CHECK (timezone = 'Asia/Seoul'),
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS source_evidence (
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

    CREATE TABLE IF NOT EXISTS digest_trend_items (
      digest_id TEXT NOT NULL,
      trend_item_id TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (digest_id, trend_item_id),
      UNIQUE (digest_id, position),
      FOREIGN KEY (digest_id) REFERENCES digests(id) ON DELETE CASCADE,
      FOREIGN KEY (trend_item_id) REFERENCES trend_items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_digests_report_date ON digests(report_date);
    CREATE INDEX IF NOT EXISTS idx_source_evidence_trend_item_id ON source_evidence(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_source_evidence_fetched_at ON source_evidence(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_digest_trend_items_digest_id ON digest_trend_items(digest_id);
    CREATE INDEX IF NOT EXISTS idx_digest_trend_items_trend_item_id ON digest_trend_items(trend_item_id);
  `);
}
