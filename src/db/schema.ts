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

    CREATE TABLE IF NOT EXISTS trend_assessments (
      id TEXT PRIMARY KEY,
      trend_item_id TEXT NOT NULL,
      report_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      why_it_matters TEXT NOT NULL,
      practical_impact TEXT NOT NULL,
      trend_category TEXT NOT NULL CHECK (
        trend_category IN (
          'model',
          'coding_agent',
          'product',
          'open_source',
          'benchmark',
          'infra',
          'safety',
          'business',
          'research'
        )
      ),
      action_level TEXT NOT NULL CHECK (
        action_level IN ('do_now', 'do_next', 'watch_later', 'needs_confirmation')
      ),
      confirmation_status TEXT NOT NULL CHECK (
        confirmation_status IN ('confirmed', 'official_only', 'needs_confirmation', 'conflicting', 'excluded')
      ),
      confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      importance_score INTEGER NOT NULL CHECK (importance_score >= 0 AND importance_score <= 100),
      contradiction_notes TEXT,
      staleness_policy TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE (trend_item_id, report_date),
      FOREIGN KEY (trend_item_id) REFERENCES trend_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trend_assessment_lineage (
      assessment_id TEXT NOT NULL,
      source_evidence_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (assessment_id, source_evidence_id),
      FOREIGN KEY (assessment_id) REFERENCES trend_assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (source_evidence_id) REFERENCES source_evidence(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS slack_delivery_attempts (
      id TEXT PRIMARY KEY,
      report_date TEXT NOT NULL,
      webhook_host TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      http_status_code INTEGER,
      error_message TEXT,
      sent_at TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_digests_report_date ON digests(report_date);
    CREATE INDEX IF NOT EXISTS idx_source_evidence_trend_item_id ON source_evidence(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_source_evidence_fetched_at ON source_evidence(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_digest_trend_items_digest_id ON digest_trend_items(digest_id);
    CREATE INDEX IF NOT EXISTS idx_digest_trend_items_trend_item_id ON digest_trend_items(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_report_date ON trend_assessments(report_date);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_score
      ON trend_assessments(report_date, importance_score DESC, confidence DESC);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_trend_item_id ON trend_assessments(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_confirmation_status ON trend_assessments(confirmation_status);
    CREATE INDEX IF NOT EXISTS idx_trend_assessment_lineage_assessment_id ON trend_assessment_lineage(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_trend_assessment_lineage_source_evidence_id
      ON trend_assessment_lineage(source_evidence_id);
    CREATE INDEX IF NOT EXISTS idx_slack_delivery_attempts_report_date ON slack_delivery_attempts(report_date);
    CREATE INDEX IF NOT EXISTS idx_slack_delivery_attempts_sent_at ON slack_delivery_attempts(sent_at);
    CREATE INDEX IF NOT EXISTS idx_slack_delivery_attempts_duplicate_guard
      ON slack_delivery_attempts(report_date, payload_hash, status);
  `);
  db.pragma("user_version = 4");
}
