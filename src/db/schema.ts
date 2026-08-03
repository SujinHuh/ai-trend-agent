import type { SqliteDatabase } from "./sqlite.js";

export function initializeSchema(db: SqliteDatabase): void {
  db.pragma("foreign_keys = ON");
  if (sqliteObjectExists(db, "table", "slack_delivery_attempts")) {
    assertSlackDeliveryAttemptsSchema(db);
  }
  if (sqliteObjectExists(db, "table", "cron_runs")) {
    assertCronRunsSchema(db);
  }
  if (sqliteObjectExists(db, "table", "social_signal_items")) {
    assertSocialSignalItemsSchema(db);
  }
  if (sqliteObjectExists(db, "table", "llm_usage_logs")) {
    assertLlmUsageLogsSchema(db);
  }
  if (sqliteObjectExists(db, "table", "user_interest_profiles")) {
    assertUserInterestProfilesSchema(db);
  }
  if (sqliteObjectExists(db, "table", "personalization_feedback")) {
    assertPersonalizationFeedbackSchema(db);
  }
  try {
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

	    CREATE TABLE IF NOT EXISTS cron_runs (
	      id TEXT PRIMARY KEY,
	      idempotency_key TEXT NOT NULL,
	      report_date TEXT NOT NULL,
	      mode TEXT NOT NULL CHECK (mode IN ('dry_run', 'send')),
	      status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
	      started_at TEXT NOT NULL,
	      finished_at TEXT,
	      step_name TEXT NOT NULL,
	      candidate_count INTEGER,
	      slack_attempt_id TEXT,
	      error_message TEXT,
	      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	      FOREIGN KEY (slack_attempt_id) REFERENCES slack_delivery_attempts(id) ON DELETE SET NULL
	    );

	    CREATE TABLE IF NOT EXISTS social_signal_items (
	      id TEXT PRIMARY KEY,
	      source_id TEXT NOT NULL,
	      platform TEXT NOT NULL CHECK (platform IN ('x', 'threads', 'reddit', 'hacker_news', 'newsletter', 'manual')),
	      author_handle TEXT,
	      author_display_name TEXT,
	      url TEXT NOT NULL,
	      canonical_url TEXT NOT NULL,
	      text TEXT NOT NULL,
	      published_at TEXT,
	      collected_at TEXT NOT NULL,
	      outbound_urls_json TEXT NOT NULL,
	      confirmation_status TEXT NOT NULL CHECK (
	        confirmation_status IN (
	          'needs_confirmation',
	          'confirmed_by_official_link',
	          'multi_signal_unconfirmed',
	          'contradicted'
	        )
	      ),
	      linked_official_evidence_ids_json TEXT NOT NULL,
	      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	      UNIQUE (source_id, canonical_url)
	    );

	    CREATE TABLE IF NOT EXISTS llm_usage_logs (
	      id TEXT PRIMARY KEY,
	      report_date TEXT NOT NULL,
	      purpose TEXT NOT NULL CHECK (purpose IN ('digest_intelligence')),
	      provider_name TEXT NOT NULL,
	      model_name TEXT NOT NULL,
	      candidate_count INTEGER NOT NULL CHECK (candidate_count >= 0),
	      input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
	      output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
	      total_tokens INTEGER NOT NULL CHECK (total_tokens >= 0),
	      estimated_cost_usd REAL NOT NULL CHECK (estimated_cost_usd >= 0),
	      status TEXT NOT NULL CHECK (status IN ('success', 'fallback')),
	      error_message TEXT,
	      created_at TEXT NOT NULL
	    );

	    CREATE TABLE IF NOT EXISTS user_interest_profiles (
	      id TEXT PRIMARY KEY,
	      high_priority_tags_json TEXT NOT NULL,
	      normal_priority_tags_json TEXT NOT NULL,
	      muted_tags_json TEXT NOT NULL,
	      enabled_domains_json TEXT NOT NULL,
	      blocked_keywords_json TEXT NOT NULL,
	      preferred_delivery_time TEXT NOT NULL,
	      timezone TEXT NOT NULL CHECK (timezone = 'Asia/Seoul'),
	      created_at TEXT NOT NULL,
	      updated_at TEXT NOT NULL
	    );

	    CREATE TABLE IF NOT EXISTS personalization_feedback (
	      id TEXT PRIMARY KEY,
	      event_key TEXT NOT NULL UNIQUE,
	      user_profile_id TEXT NOT NULL,
	      trend_item_id TEXT NOT NULL,
	      action TEXT NOT NULL CHECK (action IN ('interested', 'save_later', 'hide')),
	      occurred_at TEXT NOT NULL,
	      created_at TEXT NOT NULL,
	      FOREIGN KEY (user_profile_id) REFERENCES user_interest_profiles(id) ON DELETE CASCADE,
	      FOREIGN KEY (trend_item_id) REFERENCES trend_items(id) ON DELETE CASCADE
	    );

    CREATE INDEX IF NOT EXISTS idx_digests_report_date ON digests(report_date);
    CREATE INDEX IF NOT EXISTS idx_source_evidence_trend_item_id ON source_evidence(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_source_evidence_fetched_at ON source_evidence(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_digest_trend_items_digest_id ON digest_trend_items(digest_id);
    CREATE INDEX IF NOT EXISTS idx_digest_trend_items_trend_item_id ON digest_trend_items(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_report_date ON trend_assessments(report_date);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_score ON trend_assessments(report_date, importance_score DESC, confidence DESC);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_trend_item_id ON trend_assessments(trend_item_id);
    CREATE INDEX IF NOT EXISTS idx_trend_assessments_confirmation_status ON trend_assessments(confirmation_status);
    CREATE INDEX IF NOT EXISTS idx_trend_assessment_lineage_assessment_id ON trend_assessment_lineage(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_trend_assessment_lineage_source_evidence_id ON trend_assessment_lineage(source_evidence_id);
    CREATE INDEX IF NOT EXISTS idx_slack_delivery_attempts_report_date ON slack_delivery_attempts(report_date);
    CREATE INDEX IF NOT EXISTS idx_slack_delivery_attempts_sent_at ON slack_delivery_attempts(sent_at);
	    CREATE INDEX IF NOT EXISTS idx_slack_delivery_attempts_duplicate_guard
	      ON slack_delivery_attempts(report_date, payload_hash, status);
	    CREATE INDEX IF NOT EXISTS idx_cron_runs_idempotency_status
	      ON cron_runs(idempotency_key, mode, status);
	    CREATE UNIQUE INDEX IF NOT EXISTS idx_cron_runs_active_send_claim
	      ON cron_runs(idempotency_key, mode)
	      WHERE mode = 'send' AND status = 'running';
	    CREATE INDEX IF NOT EXISTS idx_cron_runs_report_date ON cron_runs(report_date);
	    CREATE INDEX IF NOT EXISTS idx_cron_runs_started_at ON cron_runs(started_at);
	    CREATE INDEX IF NOT EXISTS idx_social_signal_items_source_id ON social_signal_items(source_id);
	    CREATE INDEX IF NOT EXISTS idx_social_signal_items_platform ON social_signal_items(platform);
	    CREATE INDEX IF NOT EXISTS idx_social_signal_items_confirmation_status ON social_signal_items(confirmation_status);
	    CREATE INDEX IF NOT EXISTS idx_social_signal_items_published_at ON social_signal_items(published_at);
	    CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_report_date ON llm_usage_logs(report_date);
	    CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_created_at ON llm_usage_logs(created_at);
	    CREATE INDEX IF NOT EXISTS idx_personalization_feedback_user_time
	      ON personalization_feedback(user_profile_id, occurred_at DESC);
	    CREATE INDEX IF NOT EXISTS idx_personalization_feedback_user_item
	      ON personalization_feedback(user_profile_id, trend_item_id, occurred_at DESC);
	    `);
  } catch (error) {
    throwSlackSchemaDriftError(error);
  }
  assertSlackDeliveryAttemptsSchema(db);
  assertCronRunsSchema(db);
  assertSocialSignalItemsSchema(db);
  assertLlmUsageLogsSchema(db);
  assertUserInterestProfilesSchema(db);
  assertPersonalizationFeedbackSchema(db);
  db.pragma("user_version = 8");
}

function sqliteObjectExists(db: SqliteDatabase, type: string, name: string): boolean {
  return Boolean(
    db
      .prepare(
        `
          SELECT 1
          FROM sqlite_master
          WHERE type = ?
            AND name = ?
        `
      )
      .pluck()
      .get(type, name)
  );
}

function throwSlackSchemaDriftError(error: unknown): never {
  if (error instanceof Error && isKnownSchemaDriftError(error.message)) {
    throw new Error(`schema drift: ${error.message}`);
  }

  throw error;
}

function isKnownSchemaDriftError(message: string): boolean {
  return (
    message.includes("slack_delivery_attempts") ||
    message.includes("cron_runs") ||
    message.includes("payload_hash") ||
    message.includes("idempotency_key") ||
    message.includes("sent_at") ||
    message.includes("report_date") ||
    message.includes("active_send_claim") ||
    message.includes("social_signal_items") ||
    message.includes("outbound_urls_json") ||
    message.includes("linked_official_evidence_ids_json") ||
    message.includes("llm_usage_logs") ||
    message.includes("input_tokens") ||
    message.includes("estimated_cost_usd") ||
    message.includes("user_interest_profiles") ||
    message.includes("personalization_feedback") ||
    message.includes("event_key")
  );
}

function assertUserInterestProfilesSchema(db: SqliteDatabase): void {
  assertExactColumns(db, "user_interest_profiles", [
    ["id", "TEXT", false, true],
    ["high_priority_tags_json", "TEXT", true, false],
    ["normal_priority_tags_json", "TEXT", true, false],
    ["muted_tags_json", "TEXT", true, false],
    ["enabled_domains_json", "TEXT", true, false],
    ["blocked_keywords_json", "TEXT", true, false],
    ["preferred_delivery_time", "TEXT", true, false],
    ["timezone", "TEXT", true, false],
    ["created_at", "TEXT", true, false],
    ["updated_at", "TEXT", true, false]
  ]);
  const tableSql = getNormalizedTableSql(db, "user_interest_profiles");
  if (!tableSql.includes("timezone = 'asia/seoul'")) {
    throw new Error("user_interest_profiles schema drift: missing timezone CHECK constraint");
  }
}

function assertPersonalizationFeedbackSchema(db: SqliteDatabase): void {
  assertExactColumns(db, "personalization_feedback", [
    ["id", "TEXT", false, true],
    ["event_key", "TEXT", true, false],
    ["user_profile_id", "TEXT", true, false],
    ["trend_item_id", "TEXT", true, false],
    ["action", "TEXT", true, false],
    ["occurred_at", "TEXT", true, false],
    ["created_at", "TEXT", true, false]
  ]);
  assertIndexColumns(db, "idx_personalization_feedback_user_time", ["user_profile_id", "occurred_at"]);
  assertIndexColumns(db, "idx_personalization_feedback_user_item", [
    "user_profile_id",
    "trend_item_id",
    "occurred_at"
  ]);
  const tableSql = getNormalizedTableSql(db, "personalization_feedback");
  if (!tableSql.includes("event_key text not null unique")) {
    throw new Error("personalization_feedback schema drift: missing event_key UNIQUE constraint");
  }
  if (!tableSql.includes("action in ('interested', 'save_later', 'hide')")) {
    throw new Error("personalization_feedback schema drift: missing action CHECK constraint");
  }
  const foreignKeys = db.prepare("PRAGMA foreign_key_list(personalization_feedback)").all() as Array<{
    table: string;
    from: string;
    on_delete: string;
  }>;
  const expectedForeignKeys = [
    { table: "user_interest_profiles", from: "user_profile_id" },
    { table: "trend_items", from: "trend_item_id" }
  ];
  for (const expected of expectedForeignKeys) {
    const foreignKey = foreignKeys.find(
      (candidate) => candidate.table === expected.table && candidate.from === expected.from
    );
    if (foreignKey === undefined || foreignKey.on_delete.toUpperCase() !== "CASCADE") {
      throw new Error(`personalization_feedback schema drift: invalid foreign key ${expected.from}`);
    }
  }
}

function getNormalizedTableSql(db: SqliteDatabase, table: string): string {
  const sql = db.prepare(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`
  ).pluck().get(table) as string | undefined;
  if (sql === undefined) {
    throw new Error(`${table} schema drift: missing table SQL`);
  }
  return sql.replace(/\s+/g, " ").toLowerCase();
}

function assertExactColumns(
  db: SqliteDatabase,
  table: string,
  expected: Array<[string, string, boolean, boolean]>
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;
  if (columns.length !== expected.length) {
    throw new Error(`${table} schema drift: expected ${expected.length} columns, found ${columns.length}`);
  }
  for (const [name, type, notnull, pk] of expected) {
    const column = columns.find((candidate) => candidate.name === name);
    if (
      column === undefined ||
      column.type.toUpperCase() !== type ||
      Boolean(column.notnull) !== notnull ||
      Boolean(column.pk) !== pk
    ) {
      throw new Error(`${table} schema drift: invalid column ${name}`);
    }
  }
}

function assertLlmUsageLogsSchema(db: SqliteDatabase): void {
  const columns = db.prepare("PRAGMA table_info(llm_usage_logs)").all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;

  const expectedColumns = new Map([
    ["id", { type: "TEXT", notnull: false, pk: true }],
    ["report_date", { type: "TEXT", notnull: true, pk: false }],
    ["purpose", { type: "TEXT", notnull: true, pk: false }],
    ["provider_name", { type: "TEXT", notnull: true, pk: false }],
    ["model_name", { type: "TEXT", notnull: true, pk: false }],
    ["candidate_count", { type: "INTEGER", notnull: true, pk: false }],
    ["input_tokens", { type: "INTEGER", notnull: true, pk: false }],
    ["output_tokens", { type: "INTEGER", notnull: true, pk: false }],
    ["total_tokens", { type: "INTEGER", notnull: true, pk: false }],
    ["estimated_cost_usd", { type: "REAL", notnull: true, pk: false }],
    ["status", { type: "TEXT", notnull: true, pk: false }],
    ["error_message", { type: "TEXT", notnull: false, pk: false }],
    ["created_at", { type: "TEXT", notnull: true, pk: false }]
  ]);

  for (const [name, expected] of expectedColumns) {
    const column = columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(`llm_usage_logs schema drift: missing column ${name}`);
    }
    if (column.type.toUpperCase() !== expected.type) {
      throw new Error(`llm_usage_logs schema drift: column ${name} type is ${column.type}, expected ${expected.type}`);
    }
    if (Boolean(column.notnull) !== expected.notnull) {
      throw new Error(
        `llm_usage_logs schema drift: column ${name} notnull is ${column.notnull}, expected ${
          expected.notnull ? 1 : 0
        }`
      );
    }
    if (Boolean(column.pk) !== expected.pk) {
      throw new Error(
        `llm_usage_logs schema drift: column ${name} primary key is ${column.pk}, expected ${expected.pk ? 1 : 0}`
      );
    }
  }

  if (columns.length !== expectedColumns.size) {
    throw new Error(`llm_usage_logs schema drift: expected ${expectedColumns.size} columns, found ${columns.length}`);
  }

  assertIndexColumns(db, "idx_llm_usage_logs_report_date", ["report_date"]);
  assertIndexColumns(db, "idx_llm_usage_logs_created_at", ["created_at"]);
}

function assertSocialSignalItemsSchema(db: SqliteDatabase): void {
  const columns = db
    .prepare("PRAGMA table_info(social_signal_items)")
    .all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;

  const expectedColumns = new Map([
    ["id", { type: "TEXT", notnull: false, pk: true }],
    ["source_id", { type: "TEXT", notnull: true, pk: false }],
    ["platform", { type: "TEXT", notnull: true, pk: false }],
    ["author_handle", { type: "TEXT", notnull: false, pk: false }],
    ["author_display_name", { type: "TEXT", notnull: false, pk: false }],
    ["url", { type: "TEXT", notnull: true, pk: false }],
    ["canonical_url", { type: "TEXT", notnull: true, pk: false }],
    ["text", { type: "TEXT", notnull: true, pk: false }],
    ["published_at", { type: "TEXT", notnull: false, pk: false }],
    ["collected_at", { type: "TEXT", notnull: true, pk: false }],
    ["outbound_urls_json", { type: "TEXT", notnull: true, pk: false }],
    ["confirmation_status", { type: "TEXT", notnull: true, pk: false }],
    ["linked_official_evidence_ids_json", { type: "TEXT", notnull: true, pk: false }],
    ["created_at", { type: "TEXT", notnull: true, pk: false }],
    ["updated_at", { type: "TEXT", notnull: true, pk: false }]
  ]);

  for (const [name, expected] of expectedColumns) {
    const column = columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(`social_signal_items schema drift: missing column ${name}`);
    }
    if (column.type.toUpperCase() !== expected.type) {
      throw new Error(`social_signal_items schema drift: column ${name} type is ${column.type}, expected ${expected.type}`);
    }
    if (Boolean(column.notnull) !== expected.notnull) {
      throw new Error(
        `social_signal_items schema drift: column ${name} notnull is ${column.notnull}, expected ${
          expected.notnull ? 1 : 0
        }`
      );
    }
    if (Boolean(column.pk) !== expected.pk) {
      throw new Error(
        `social_signal_items schema drift: column ${name} primary key is ${column.pk}, expected ${expected.pk ? 1 : 0}`
      );
    }
  }

  if (columns.length !== expectedColumns.size) {
    throw new Error(`social_signal_items schema drift: expected ${expectedColumns.size} columns, found ${columns.length}`);
  }

  assertIndexColumns(db, "idx_social_signal_items_source_id", ["source_id"]);
  assertIndexColumns(db, "idx_social_signal_items_confirmation_status", ["confirmation_status"]);
}

function assertSlackDeliveryAttemptsSchema(db: SqliteDatabase): void {
  const columns = db
    .prepare("PRAGMA table_info(slack_delivery_attempts)")
    .all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;

  const expectedColumns = new Map([
    ["id", { type: "TEXT", notnull: false, pk: true }],
    ["report_date", { type: "TEXT", notnull: true, pk: false }],
    ["webhook_host", { type: "TEXT", notnull: true, pk: false }],
    ["status", { type: "TEXT", notnull: true, pk: false }],
    ["http_status_code", { type: "INTEGER", notnull: false, pk: false }],
    ["error_message", { type: "TEXT", notnull: false, pk: false }],
    ["sent_at", { type: "TEXT", notnull: true, pk: false }],
    ["payload_hash", { type: "TEXT", notnull: true, pk: false }],
    ["created_at", { type: "TEXT", notnull: true, pk: false }]
  ]);

  for (const [name, expected] of expectedColumns) {
    const column = columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(`slack_delivery_attempts schema drift: missing column ${name}`);
    }

    if (column.type.toUpperCase() !== expected.type) {
      throw new Error(
        `slack_delivery_attempts schema drift: column ${name} type is ${column.type}, expected ${expected.type}`
      );
    }

    if (Boolean(column.notnull) !== expected.notnull) {
      throw new Error(
        `slack_delivery_attempts schema drift: column ${name} notnull is ${column.notnull}, expected ${
          expected.notnull ? 1 : 0
        }`
      );
    }

    if (Boolean(column.pk) !== expected.pk) {
      throw new Error(
        `slack_delivery_attempts schema drift: column ${name} primary key is ${column.pk}, expected ${
          expected.pk ? 1 : 0
        }`
      );
    }
  }

  if (columns.length !== expectedColumns.size) {
    throw new Error(
      `slack_delivery_attempts schema drift: expected ${expectedColumns.size} columns, found ${columns.length}`
    );
  }

  const tableSql = (
    db
      .prepare(
        `
          SELECT sql
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'slack_delivery_attempts'
        `
      )
      .pluck()
      .get() as string | undefined
  )
    ?.replace(/\s+/g, " ")
    .toLowerCase();

  if (
    !tableSql?.includes("status in ('success', 'failed')") &&
    !tableSql?.includes('status in ("success", "failed")')
  ) {
    throw new Error("slack_delivery_attempts schema drift: missing status CHECK constraint");
  }

  assertIndexColumns(db, "idx_slack_delivery_attempts_report_date", ["report_date"]);
  assertIndexColumns(db, "idx_slack_delivery_attempts_sent_at", ["sent_at"]);
  assertIndexColumns(db, "idx_slack_delivery_attempts_duplicate_guard", ["report_date", "payload_hash", "status"]);
}

function assertCronRunsSchema(db: SqliteDatabase): void {
  const columns = db.prepare("PRAGMA table_info(cron_runs)").all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;

  const expectedColumns = new Map([
    ["id", { type: "TEXT", notnull: false, pk: true }],
    ["idempotency_key", { type: "TEXT", notnull: true, pk: false }],
    ["report_date", { type: "TEXT", notnull: true, pk: false }],
    ["mode", { type: "TEXT", notnull: true, pk: false }],
    ["status", { type: "TEXT", notnull: true, pk: false }],
    ["started_at", { type: "TEXT", notnull: true, pk: false }],
    ["finished_at", { type: "TEXT", notnull: false, pk: false }],
    ["step_name", { type: "TEXT", notnull: true, pk: false }],
    ["candidate_count", { type: "INTEGER", notnull: false, pk: false }],
    ["slack_attempt_id", { type: "TEXT", notnull: false, pk: false }],
    ["error_message", { type: "TEXT", notnull: false, pk: false }],
    ["created_at", { type: "TEXT", notnull: true, pk: false }],
    ["updated_at", { type: "TEXT", notnull: true, pk: false }]
  ]);

  for (const [name, expected] of expectedColumns) {
    const column = columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(`cron_runs schema drift: missing column ${name}`);
    }

    if (column.type.toUpperCase() !== expected.type) {
      throw new Error(`cron_runs schema drift: column ${name} type is ${column.type}, expected ${expected.type}`);
    }

    if (Boolean(column.notnull) !== expected.notnull) {
      throw new Error(
        `cron_runs schema drift: column ${name} notnull is ${column.notnull}, expected ${expected.notnull ? 1 : 0}`
      );
    }

    if (Boolean(column.pk) !== expected.pk) {
      throw new Error(
        `cron_runs schema drift: column ${name} primary key is ${column.pk}, expected ${expected.pk ? 1 : 0}`
      );
    }
  }

  if (columns.length !== expectedColumns.size) {
    throw new Error(`cron_runs schema drift: expected ${expectedColumns.size} columns, found ${columns.length}`);
  }

  const tableSql = (
    db
      .prepare(
        `
          SELECT sql
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'cron_runs'
        `
      )
      .pluck()
      .get() as string | undefined
  )
    ?.replace(/\s+/g, " ")
    .toLowerCase();

  if (!tableSql?.includes("mode in ('dry_run', 'send')") && !tableSql?.includes('mode in ("dry_run", "send")')) {
    throw new Error("cron_runs schema drift: missing mode CHECK constraint");
  }
  if (
    !tableSql?.includes("status in ('running', 'success', 'failed')") &&
    !tableSql?.includes('status in ("running", "success", "failed")')
  ) {
    throw new Error("cron_runs schema drift: missing status CHECK constraint");
  }

  assertIndexColumns(db, "idx_cron_runs_idempotency_status", ["idempotency_key", "mode", "status"]);
  assertIndexColumns(db, "idx_cron_runs_active_send_claim", ["idempotency_key", "mode"]);
  assertIndexColumns(db, "idx_cron_runs_report_date", ["report_date"]);
  assertIndexColumns(db, "idx_cron_runs_started_at", ["started_at"]);
}

function assertIndexColumns(db: SqliteDatabase, indexName: string, expectedColumns: string[]): void {
  const columns = db
    .prepare(`PRAGMA index_info(${indexName})`)
    .all() as Array<{ name: string; seqno: number }>;

  const actualColumns = columns
    .sort((left, right) => left.seqno - right.seqno)
    .map((column) => column.name);

  if (actualColumns.join(",") !== expectedColumns.join(",")) {
    throw new Error(
      `schema drift: index ${indexName} columns are ${actualColumns.join(",")}, expected ${expectedColumns.join(",")}`
    );
  }
}
