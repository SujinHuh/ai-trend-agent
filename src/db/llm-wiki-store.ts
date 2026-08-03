import type {
  ActionLevel,
  ConfirmationStatus,
  CronRun,
  CronRunMode,
  CronRunStatus,
  Digest,
  DigestCandidate,
  DigestWithItems,
  LlmUsageLog,
  SlackDeliveryAttempt,
  SlackDeliveryStatus,
  SocialConfirmationStatus,
  SocialPlatform,
  SocialSignalItem,
  SourceEvidence,
  TrendAssessment,
  TrendAssessmentInput,
  TrendAssessmentLineage,
  TrendCategory,
  TrendItem
} from "../domain/types.js";
import {
  createCronRunId,
  createDigestId,
  createEvidenceId,
  createLlmUsageLogId,
  createSlackDeliveryAttemptId,
  createSocialSignalId,
  createTrendAssessmentId,
  createTrendIdentity
} from "../identity/stable-id.js";
import { canonicalizeUrl } from "../url/canonicalize-url.js";
import { initializeSchema } from "./schema.js";
import type { SqliteDatabase } from "./sqlite.js";

interface TrendItemRow {
  id: string;
  canonical_url: string;
  canonical_hash: string;
  title: string;
  source_name: string;
  published_at: string | null;
}

interface DigestRow {
  id: string;
  report_date: string;
  timezone: "Asia/Seoul";
  generated_at: string;
}

interface SourceEvidenceRow {
  id: string;
  trend_item_id: string;
  source_url: string;
  source_name: string;
  fetched_at: string;
  evidence_excerpt: string | null;
  confidence_score: number;
}

interface TrendAssessmentRow {
  id: string;
  trend_item_id: string;
  report_date: string;
  summary: string;
  why_it_matters: string;
  practical_impact: string;
  trend_category: TrendCategory;
  action_level: ActionLevel;
  confirmation_status: ConfirmationStatus;
  confidence: number;
  importance_score: number;
  contradiction_notes: string | null;
  staleness_policy: string;
  created_at: string;
  updated_at: string;
}

interface TrendAssessmentLineageRow {
  assessment_id: string;
  source_evidence_id: string;
  source_name: string;
  source_url: string;
  confidence_score: number;
}

interface SlackDeliveryAttemptRow {
  id: string;
  report_date: string;
  webhook_host: string;
  status: SlackDeliveryStatus;
  http_status_code: number | null;
  error_message: string | null;
  sent_at: string;
  payload_hash: string;
}

interface CronRunRow {
  id: string;
  idempotency_key: string;
  report_date: string;
  mode: CronRunMode;
  status: CronRunStatus;
  started_at: string;
  finished_at: string | null;
  step_name: string;
  candidate_count: number | null;
  slack_attempt_id: string | null;
  error_message: string | null;
}

interface LlmUsageLogRow {
  id: string;
  report_date: string;
  purpose: "digest_intelligence";
  provider_name: string;
  model_name: string;
  candidate_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  status: "success" | "fallback";
  error_message: string | null;
  created_at: string;
}

interface SocialSignalItemRow {
  id: string;
  source_id: string;
  platform: SocialPlatform;
  author_handle: string | null;
  author_display_name: string | null;
  url: string;
  canonical_url: string;
  text: string;
  published_at: string | null;
  collected_at: string;
  outbound_urls_json: string;
  confirmation_status: SocialConfirmationStatus;
  linked_official_evidence_ids_json: string;
  created_at: string;
  updated_at: string;
}

export interface SaveTrendItemInput {
  sourceUrl: string;
  title: string;
  sourceName: string;
  publishedAt?: string | null;
}

export interface SaveDigestInput {
  reportDate: string;
  generatedAt: string;
  timezone?: "Asia/Seoul";
  trendItemIds?: string[];
}

export interface SaveSourceEvidenceInput {
  trendItemId: string;
  sourceUrl: string;
  sourceName: string;
  fetchedAt: string;
  evidenceExcerpt?: string | null;
  confidenceScore: number;
}

export interface LinkDigestTrendItemInput {
  digestId: string;
  trendItemId: string;
  position: number;
}

export interface SaveTrendAssessmentInput {
  trendItemId: string;
  reportDate: string;
  summary: string;
  whyItMatters: string;
  practicalImpact: string;
  trendCategory: TrendCategory;
  actionLevel: ActionLevel;
  confirmationStatus: ConfirmationStatus;
  confidence: number;
  importanceScore: number;
  contradictionNotes?: string | null;
  stalenessPolicy: string;
  sourceEvidenceIds: string[];
}

export interface SaveSlackDeliveryAttemptInput {
  reportDate: string;
  webhookHost: string;
  status: SlackDeliveryStatus;
  httpStatusCode?: number | null;
  errorMessage?: string | null;
  sentAt: string;
  payloadHash: string;
}

export interface CreateCronRunInput {
  idempotencyKey: string;
  reportDate: string;
  mode: CronRunMode;
  startedAt: string;
  stepName: string;
}

export interface CompleteCronRunInput {
  finishedAt: string;
  stepName: string;
  candidateCount?: number | null;
  slackAttemptId?: string | null;
  errorMessage?: string | null;
}

export interface SaveLlmUsageLogInput {
  reportDate: string;
  purpose: "digest_intelligence";
  providerName: string;
  modelName: string;
  candidateCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  status: "success" | "fallback";
  errorMessage?: string | null;
  createdAt: string;
}

export interface SaveSocialSignalItemInput {
  sourceId: string;
  platform: SocialPlatform;
  authorHandle?: string | null;
  authorDisplayName?: string | null;
  url: string;
  canonicalUrl: string;
  text: string;
  publishedAt?: string | null;
  collectedAt: string;
  outboundUrls: string[];
  confirmationStatus: SocialConfirmationStatus;
  linkedOfficialEvidenceIds: string[];
}

export class LlmWikiStore {
  constructor(private readonly db: SqliteDatabase) {}

  initialize(): void {
    initializeSchema(this.db);
  }

  saveTrendItem(input: SaveTrendItemInput): TrendItem {
    const identity = createTrendIdentity(input.sourceUrl);

    this.db
      .prepare(
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
          ON CONFLICT(canonical_hash) DO UPDATE SET
            title = excluded.title,
            source_name = excluded.source_name,
            published_at = excluded.published_at,
            updated_at = datetime('now')
        `
      )
      .run(
        identity.id,
        identity.canonicalUrl,
        identity.canonicalHash,
        input.title,
        input.sourceName,
        input.publishedAt ?? null
      );

    const trendItem = this.getTrendItem(identity.id);

    if (trendItem === null) {
      throw new Error(`TrendItem was not saved: ${identity.id}`);
    }

    return trendItem;
  }

  getTrendItem(id: string): TrendItem | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            canonical_url,
            canonical_hash,
            title,
            source_name,
            published_at
          FROM trend_items
          WHERE id = ?
        `
      )
      .get(id) as TrendItemRow | undefined;

    return row === undefined ? null : mapTrendItem(row);
  }

  saveDigest(input: SaveDigestInput): Digest {
    const id = createDigestId(input.reportDate);
    const timezone = input.timezone ?? "Asia/Seoul";

    const upsertDigest = () => {
      this.db
        .prepare(
          `
            INSERT INTO digests (id, report_date, timezone, generated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(report_date) DO UPDATE SET
              timezone = excluded.timezone,
              generated_at = excluded.generated_at,
              updated_at = datetime('now')
          `
        )
        .run(id, input.reportDate, timezone, input.generatedAt);
    };

    if (input.trendItemIds === undefined) {
      upsertDigest();
    } else {
      const saveDigestWithItems = this.db.transaction(() => {
        upsertDigest();
        this.db.prepare("DELETE FROM digest_trend_items WHERE digest_id = ?").run(id);

        const insertLink = this.db.prepare(
          "INSERT INTO digest_trend_items (digest_id, trend_item_id, position) VALUES (?, ?, ?)"
        );
        input.trendItemIds?.forEach((trendItemId, index) => {
          insertLink.run(id, trendItemId, index + 1);
        });
      });

      saveDigestWithItems();
    }

    const digest = this.getDigest(input.reportDate);

    if (digest === null) {
      throw new Error(`Digest was not saved: ${input.reportDate}`);
    }

    return digest;
  }

  getDigest(reportDate: string): Digest | null {
    const row = this.db
      .prepare(
        `
          SELECT id, report_date, timezone, generated_at
          FROM digests
          WHERE report_date = ?
        `
      )
      .get(reportDate) as DigestRow | undefined;

    return row === undefined ? null : mapDigest(row);
  }

  linkDigestTrendItem(input: LinkDigestTrendItemInput): void {
    this.db
      .prepare(
        `
          INSERT INTO digest_trend_items (digest_id, trend_item_id, position)
          VALUES (?, ?, ?)
          ON CONFLICT(digest_id, trend_item_id) DO UPDATE SET
            position = excluded.position
        `
      )
      .run(input.digestId, input.trendItemId, input.position);
  }

  saveSourceEvidence(input: SaveSourceEvidenceInput): SourceEvidence {
    const id = createEvidenceId({
      trendItemId: input.trendItemId,
      sourceUrl: input.sourceUrl,
      sourceName: input.sourceName,
      fetchedAt: input.fetchedAt
    });

    this.db
      .prepare(
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
          ON CONFLICT(id) DO UPDATE SET
            fetched_at = excluded.fetched_at,
            evidence_excerpt = excluded.evidence_excerpt,
            confidence_score = excluded.confidence_score
        `
      )
      .run(
        id,
        input.trendItemId,
        input.sourceUrl,
        input.sourceName,
        input.fetchedAt,
        input.evidenceExcerpt ?? null,
        input.confidenceScore
      );

    const evidence = this.getSourceEvidence(id);

    if (evidence === null) {
      throw new Error(`SourceEvidence was not saved: ${id}`);
    }

    return evidence;
  }

  getSourceEvidence(id: string): SourceEvidence | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            trend_item_id,
            source_url,
            source_name,
            fetched_at,
            evidence_excerpt,
            confidence_score
          FROM source_evidence
          WHERE id = ?
        `
      )
      .get(id) as SourceEvidenceRow | undefined;

    return row === undefined ? null : mapSourceEvidence(row);
  }

  saveTrendAssessment(input: SaveTrendAssessmentInput): TrendAssessment {
    const id = createTrendAssessmentId({
      trendItemId: input.trendItemId,
      reportDate: input.reportDate
    });

    const save = this.db.transaction(() => {
      this.db
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
              contradiction_notes,
              staleness_policy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(trend_item_id, report_date) DO UPDATE SET
              summary = excluded.summary,
              why_it_matters = excluded.why_it_matters,
              practical_impact = excluded.practical_impact,
              trend_category = excluded.trend_category,
              action_level = excluded.action_level,
              confirmation_status = excluded.confirmation_status,
              confidence = excluded.confidence,
              importance_score = excluded.importance_score,
              contradiction_notes = excluded.contradiction_notes,
              staleness_policy = excluded.staleness_policy,
              updated_at = datetime('now')
          `
        )
        .run(
          id,
          input.trendItemId,
          input.reportDate,
          input.summary,
          input.whyItMatters,
          input.practicalImpact,
          input.trendCategory,
          input.actionLevel,
          input.confirmationStatus,
          input.confidence,
          input.importanceScore,
          input.contradictionNotes ?? null,
          input.stalenessPolicy
        );

      this.db.prepare("DELETE FROM trend_assessment_lineage WHERE assessment_id = ?").run(id);

      const insertLineage = this.db.prepare(
        `
          INSERT INTO trend_assessment_lineage (
            assessment_id,
            source_evidence_id,
            source_name,
            source_url,
            confidence_score
          )
          SELECT ?, id, source_name, source_url, confidence_score
          FROM source_evidence
          WHERE id = ?
        `
      );

      for (const sourceEvidenceId of input.sourceEvidenceIds) {
        const result = insertLineage.run(id, sourceEvidenceId);
        if (result.changes !== 1) {
          throw new Error(`Missing SourceEvidence for assessment lineage: ${sourceEvidenceId}`);
        }
      }
    });

    save();

    const assessment = this.getTrendAssessment(id);
    if (assessment === null) {
      throw new Error(`TrendAssessment was not saved: ${id}`);
    }

    return assessment;
  }

  getTrendAssessment(id: string): TrendAssessment | null {
    const row = this.db
      .prepare(
        `
          SELECT
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
            contradiction_notes,
            staleness_policy,
            created_at,
            updated_at
          FROM trend_assessments
          WHERE id = ?
        `
      )
      .get(id) as TrendAssessmentRow | undefined;

    return row === undefined ? null : mapTrendAssessment(row);
  }

  listTrendAssessmentInputsForReportDate(reportDate: string): TrendAssessmentInput[] {
    const { startUtc, endUtc } = getKstReportDateWindow(reportDate);
    const trendItems = this.db
      .prepare(
        `
          SELECT
            id,
            canonical_url,
            canonical_hash,
            title,
            source_name,
            published_at
          FROM trend_items
          WHERE published_at >= ?
            AND published_at < ?
          ORDER BY published_at DESC, id ASC
        `
      )
      .all(startUtc, endUtc) as TrendItemRow[];

    return trendItems.map((row) => {
      const trendItem = mapTrendItem(row);
      return {
        trendItem,
        evidence: this.listSourceEvidenceForTrendItem(trendItem.id)
      };
    });
  }

  listSourceEvidenceForTrendItem(trendItemId: string): SourceEvidence[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            trend_item_id,
            source_url,
            source_name,
            fetched_at,
            evidence_excerpt,
            confidence_score
          FROM source_evidence
          WHERE trend_item_id = ?
          ORDER BY fetched_at DESC, id ASC
        `
      )
      .all(trendItemId) as SourceEvidenceRow[];

    return rows.map(mapSourceEvidence);
  }

  listDigestCandidates(reportDate: string, limit: number): DigestCandidate[] {
    const assessmentRows = this.db
      .prepare(
        `
          SELECT
            trend_assessments.id,
            trend_assessments.trend_item_id,
            trend_assessments.report_date,
            trend_assessments.summary,
            trend_assessments.why_it_matters,
            trend_assessments.practical_impact,
            trend_assessments.trend_category,
            trend_assessments.action_level,
            trend_assessments.confirmation_status,
            trend_assessments.confidence,
            trend_assessments.importance_score,
            trend_assessments.contradiction_notes,
            trend_assessments.staleness_policy,
            trend_assessments.created_at,
            trend_assessments.updated_at
          FROM trend_assessments
          JOIN trend_items t ON t.id = trend_assessments.trend_item_id
          WHERE trend_assessments.report_date = ?
            AND trend_assessments.confirmation_status IN ('confirmed', 'official_only')
          ORDER BY
            trend_assessments.importance_score DESC,
            trend_assessments.confidence DESC,
            COALESCE(t.published_at, '') DESC,
            trend_assessments.trend_item_id ASC
          LIMIT ?
        `
      )
      .all(reportDate, limit) as TrendAssessmentRow[];

    return assessmentRows.map((assessmentRow) => {
      const assessment = mapTrendAssessment(assessmentRow);
      const trendItem = this.getTrendItem(assessment.trendItemId);
      if (trendItem === null) {
        throw new Error(`Missing TrendItem for assessment: ${assessment.id}`);
      }

      return {
        assessment,
        trendItem,
        lineage: this.listTrendAssessmentLineage(assessment.id)
      };
    });
  }

  listTrendAssessmentLineage(assessmentId: string): TrendAssessmentLineage[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            assessment_id,
            source_evidence_id,
            source_name,
            source_url,
            confidence_score
          FROM trend_assessment_lineage
          WHERE assessment_id = ?
          ORDER BY source_name ASC, source_evidence_id ASC
        `
      )
      .all(assessmentId) as TrendAssessmentLineageRow[];

    return rows.map(mapTrendAssessmentLineage);
  }

  saveSlackDeliveryAttempt(input: SaveSlackDeliveryAttemptInput): SlackDeliveryAttempt {
    const id = createSlackDeliveryAttemptId({
      reportDate: input.reportDate,
      sentAt: input.sentAt,
      payloadHash: input.payloadHash
    });

    this.db
      .prepare(
        `
          INSERT INTO slack_delivery_attempts (
            id,
            report_date,
            webhook_host,
            status,
            http_status_code,
            error_message,
            sent_at,
            payload_hash
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        input.reportDate,
        input.webhookHost,
        input.status,
        input.httpStatusCode ?? null,
        input.errorMessage ?? null,
        input.sentAt,
        input.payloadHash
      );

    const attempt = this.getSlackDeliveryAttempt(id);
    if (attempt === null) {
      throw new Error(`SlackDeliveryAttempt was not saved: ${id}`);
    }

    return attempt;
  }

  getSlackDeliveryAttempt(id: string): SlackDeliveryAttempt | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            report_date,
            webhook_host,
            status,
            http_status_code,
            error_message,
            sent_at,
            payload_hash
          FROM slack_delivery_attempts
          WHERE id = ?
        `
      )
      .get(id) as SlackDeliveryAttemptRow | undefined;

    return row === undefined ? null : mapSlackDeliveryAttempt(row);
  }

  listSlackDeliveryAttempts(reportDate: string): SlackDeliveryAttempt[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            report_date,
            webhook_host,
            status,
            http_status_code,
            error_message,
            sent_at,
            payload_hash
          FROM slack_delivery_attempts
          WHERE report_date = ?
          ORDER BY sent_at DESC, id ASC
        `
      )
      .all(reportDate) as SlackDeliveryAttemptRow[];

    return rows.map(mapSlackDeliveryAttempt);
  }

  findSuccessfulSlackDeliveryAttempt(reportDate: string, payloadHash: string): SlackDeliveryAttempt | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            report_date,
            webhook_host,
            status,
            http_status_code,
            error_message,
            sent_at,
            payload_hash
          FROM slack_delivery_attempts
          WHERE report_date = ?
            AND payload_hash = ?
            AND status = 'success'
          ORDER BY sent_at DESC, id ASC
          LIMIT 1
        `
      )
      .get(reportDate, payloadHash) as SlackDeliveryAttemptRow | undefined;

    return row === undefined ? null : mapSlackDeliveryAttempt(row);
  }

  saveSocialSignalItem(input: SaveSocialSignalItemInput): SocialSignalItem {
    const id = createSocialSignalId({
      sourceId: input.sourceId,
      canonicalUrl: input.canonicalUrl,
      publishedAt: input.publishedAt
    });

    this.db
      .prepare(
        `
          INSERT INTO social_signal_items (
            id,
            source_id,
            platform,
            author_handle,
            author_display_name,
            url,
            canonical_url,
            text,
            published_at,
            collected_at,
            outbound_urls_json,
            confirmation_status,
            linked_official_evidence_ids_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id, canonical_url) DO UPDATE SET
            author_handle = excluded.author_handle,
            author_display_name = excluded.author_display_name,
            text = excluded.text,
            published_at = excluded.published_at,
            collected_at = excluded.collected_at,
            outbound_urls_json = excluded.outbound_urls_json,
            confirmation_status = excluded.confirmation_status,
            linked_official_evidence_ids_json = excluded.linked_official_evidence_ids_json,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        `
      )
      .run(
        id,
        input.sourceId,
        input.platform,
        input.authorHandle ?? null,
        input.authorDisplayName ?? null,
        input.url,
        input.canonicalUrl,
        input.text,
        input.publishedAt ?? null,
        input.collectedAt,
        JSON.stringify(input.outboundUrls),
        input.confirmationStatus,
        JSON.stringify(input.linkedOfficialEvidenceIds)
      );

    const item = this.getSocialSignalItem(id) ?? this.getSocialSignalItemBySourceAndUrl(input.sourceId, input.canonicalUrl);
    if (item === null) {
      throw new Error(`SocialSignalItem was not saved: ${id}`);
    }

    return item;
  }

  saveSocialSignalItems(inputs: SaveSocialSignalItemInput[]): SocialSignalItem[] {
    const saveMany = this.db.transaction((items: SaveSocialSignalItemInput[]) =>
      items.map((item) => this.saveSocialSignalItem(item))
    );
    return saveMany(inputs);
  }

  getSocialSignalItem(id: string): SocialSignalItem | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            source_id,
            platform,
            author_handle,
            author_display_name,
            url,
            canonical_url,
            text,
            published_at,
            collected_at,
            outbound_urls_json,
            confirmation_status,
            linked_official_evidence_ids_json,
            created_at,
            updated_at
          FROM social_signal_items
          WHERE id = ?
        `
      )
      .get(id) as SocialSignalItemRow | undefined;

    return row === undefined ? null : mapSocialSignalItem(row);
  }

  getSocialSignalItemBySourceAndUrl(sourceId: string, canonicalUrl: string): SocialSignalItem | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            source_id,
            platform,
            author_handle,
            author_display_name,
            url,
            canonical_url,
            text,
            published_at,
            collected_at,
            outbound_urls_json,
            confirmation_status,
            linked_official_evidence_ids_json,
            created_at,
            updated_at
          FROM social_signal_items
          WHERE source_id = ?
            AND canonical_url = ?
        `
      )
      .get(sourceId, canonicalUrl) as SocialSignalItemRow | undefined;

    return row === undefined ? null : mapSocialSignalItem(row);
  }

  listSocialSignalItems(sourceId?: string): SocialSignalItem[] {
    const baseSelect = `
      SELECT
        id,
        source_id,
        platform,
        author_handle,
        author_display_name,
        url,
        canonical_url,
        text,
        published_at,
        collected_at,
        outbound_urls_json,
        confirmation_status,
        linked_official_evidence_ids_json,
        created_at,
        updated_at
      FROM social_signal_items
    `;
    const rows =
      sourceId === undefined
        ? (this.db
            .prepare(`${baseSelect} ORDER BY collected_at DESC, id ASC`)
            .all() as SocialSignalItemRow[])
        : (this.db
            .prepare(`${baseSelect} WHERE source_id = ? ORDER BY collected_at DESC, id ASC`)
            .all(sourceId) as SocialSignalItemRow[]);

    return rows.map(mapSocialSignalItem);
  }

  findSourceEvidenceByCanonicalUrls(canonicalUrls: string[]): SourceEvidence[] {
    if (canonicalUrls.length === 0) {
      return [];
    }
    const uniqueUrls = new Set(canonicalUrls.map(canonicalizeUrl));
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            trend_item_id,
            source_url,
            source_name,
            fetched_at,
            evidence_excerpt,
            confidence_score
          FROM source_evidence
        `
      )
      .all() as SourceEvidenceRow[];

    return rows.map(mapSourceEvidence).filter((evidence) => uniqueUrls.has(canonicalizeUrl(evidence.sourceUrl)));
  }

  countSocialSignalsLinkedToEvidence(sourceEvidenceIds: string[]): number {
    if (sourceEvidenceIds.length === 0) {
      return 0;
    }
    const ids = new Set(sourceEvidenceIds);
    return this.listSocialSignalItems().filter((item) =>
      item.linkedOfficialEvidenceIds.some((evidenceId) => ids.has(evidenceId))
    ).length;
  }

  createCronRun(input: CreateCronRunInput): CronRun {
    const id = createCronRunId({
      idempotencyKey: input.idempotencyKey,
      startedAt: input.startedAt
    });

    this.db
      .prepare(
        `
          INSERT INTO cron_runs (
            id,
            idempotency_key,
            report_date,
            mode,
            status,
            started_at,
            step_name
          )
          VALUES (?, ?, ?, ?, 'running', ?, ?)
        `
      )
      .run(id, input.idempotencyKey, input.reportDate, input.mode, input.startedAt, input.stepName);

    const run = this.getCronRun(id);
    if (run === null) {
      throw new Error(`CronRun was not saved: ${id}`);
    }

    return run;
  }

  markCronRunSuccess(id: string, input: CompleteCronRunInput): CronRun {
    return this.updateCronRun(id, "success", input);
  }

  markCronRunFailure(id: string, input: CompleteCronRunInput): CronRun {
    return this.updateCronRun(id, "failed", input);
  }

  getCronRun(id: string): CronRun | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            idempotency_key,
            report_date,
            mode,
            status,
            started_at,
            finished_at,
            step_name,
            candidate_count,
            slack_attempt_id,
            error_message
          FROM cron_runs
          WHERE id = ?
        `
      )
      .get(id) as CronRunRow | undefined;

    return row === undefined ? null : mapCronRun(row);
  }

  findSuccessfulCronRun(idempotencyKey: string, mode: CronRunMode = "send"): CronRun | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            idempotency_key,
            report_date,
            mode,
            status,
            started_at,
            finished_at,
            step_name,
            candidate_count,
            slack_attempt_id,
            error_message
          FROM cron_runs
          WHERE idempotency_key = ?
            AND mode = ?
            AND status = 'success'
          ORDER BY finished_at DESC, started_at DESC, id ASC
          LIMIT 1
        `
      )
      .get(idempotencyKey, mode) as CronRunRow | undefined;

    return row === undefined ? null : mapCronRun(row);
  }

  findRunningCronRun(idempotencyKey: string, mode: CronRunMode = "send"): CronRun | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            idempotency_key,
            report_date,
            mode,
            status,
            started_at,
            finished_at,
            step_name,
            candidate_count,
            slack_attempt_id,
            error_message
          FROM cron_runs
          WHERE idempotency_key = ?
            AND mode = ?
            AND status = 'running'
          ORDER BY started_at DESC, id ASC
          LIMIT 1
        `
      )
      .get(idempotencyKey, mode) as CronRunRow | undefined;

    return row === undefined ? null : mapCronRun(row);
  }

  listCronRuns(reportDate: string): CronRun[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            idempotency_key,
            report_date,
            mode,
            status,
            started_at,
            finished_at,
            step_name,
            candidate_count,
            slack_attempt_id,
            error_message
          FROM cron_runs
          WHERE report_date = ?
          ORDER BY started_at DESC, id ASC
        `
      )
      .all(reportDate) as CronRunRow[];

    return rows.map(mapCronRun);
  }

  saveLlmUsageLog(input: SaveLlmUsageLogInput): LlmUsageLog {
    const totalTokens = input.inputTokens + input.outputTokens;
    const sequence = Number(
      this.db
        .prepare(
          `
            SELECT COUNT(*)
            FROM llm_usage_logs
            WHERE report_date = ?
              AND purpose = ?
              AND provider_name = ?
              AND model_name = ?
              AND created_at = ?
          `
        )
        .pluck()
        .get(input.reportDate, input.purpose, input.providerName, input.modelName, input.createdAt)
    );
    const id = createLlmUsageLogId({
      reportDate: input.reportDate,
      purpose: input.purpose,
      providerName: input.providerName,
      modelName: input.modelName,
      createdAt: input.createdAt,
      sequence
    });

    this.db
      .prepare(
        `
          INSERT INTO llm_usage_logs (
            id,
            report_date,
            purpose,
            provider_name,
            model_name,
            candidate_count,
            input_tokens,
            output_tokens,
            total_tokens,
            estimated_cost_usd,
            status,
            error_message,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        input.reportDate,
        input.purpose,
        input.providerName,
        input.modelName,
        input.candidateCount,
        input.inputTokens,
        input.outputTokens,
        totalTokens,
        input.estimatedCostUsd,
        input.status,
        input.errorMessage ?? null,
        input.createdAt
      );

    const log = this.getLlmUsageLog(id);
    if (log === null) {
      throw new Error(`LlmUsageLog was not saved: ${id}`);
    }

    return log;
  }

  getLlmUsageLog(id: string): LlmUsageLog | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            report_date,
            purpose,
            provider_name,
            model_name,
            candidate_count,
            input_tokens,
            output_tokens,
            total_tokens,
            estimated_cost_usd,
            status,
            error_message,
            created_at
          FROM llm_usage_logs
          WHERE id = ?
        `
      )
      .get(id) as LlmUsageLogRow | undefined;

    return row === undefined ? null : mapLlmUsageLog(row);
  }

  listLlmUsageLogs(reportDate: string): LlmUsageLog[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            report_date,
            purpose,
            provider_name,
            model_name,
            candidate_count,
            input_tokens,
            output_tokens,
            total_tokens,
            estimated_cost_usd,
            status,
            error_message,
            created_at
          FROM llm_usage_logs
          WHERE report_date = ?
          ORDER BY created_at DESC, id ASC
        `
      )
      .all(reportDate) as LlmUsageLogRow[];

    return rows.map(mapLlmUsageLog);
  }

  private updateCronRun(id: string, status: CronRunStatus, input: CompleteCronRunInput): CronRun {
    this.db
      .prepare(
        `
          UPDATE cron_runs
          SET
            status = ?,
            finished_at = ?,
            step_name = ?,
            candidate_count = ?,
            slack_attempt_id = ?,
            error_message = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ?
        `
      )
      .run(
        status,
        input.finishedAt,
        input.stepName,
        input.candidateCount ?? null,
        input.slackAttemptId ?? null,
        input.errorMessage ?? null,
        id
      );

    const run = this.getCronRun(id);
    if (run === null) {
      throw new Error(`CronRun was not found: ${id}`);
    }

    return run;
  }

  getDigestByReportDate(reportDate: string): DigestWithItems | null {
    const digest = this.getDigest(reportDate);

    if (digest === null) {
      return null;
    }

    const trendItems = this.db
      .prepare(
        `
          SELECT
            t.id,
            t.canonical_url,
            t.canonical_hash,
            t.title,
            t.source_name,
            t.published_at
          FROM digest_trend_items dti
          JOIN trend_items t ON t.id = dti.trend_item_id
          WHERE dti.digest_id = ?
          ORDER BY dti.position ASC
        `
      )
      .all(digest.id) as TrendItemRow[];

    const evidence = this.db
      .prepare(
        `
          SELECT
            se.id,
            se.trend_item_id,
            se.source_url,
            se.source_name,
            se.fetched_at,
            se.evidence_excerpt,
            se.confidence_score
          FROM digest_trend_items dti
          JOIN source_evidence se ON se.trend_item_id = dti.trend_item_id
          WHERE dti.digest_id = ?
          ORDER BY dti.position ASC, se.fetched_at DESC
        `
      )
      .all(digest.id) as SourceEvidenceRow[];

    return {
      digest,
      items: trendItems.map(mapTrendItem),
      evidence: evidence.map(mapSourceEvidence)
    };
  }
}

export function createLlmWikiStore(db: SqliteDatabase): LlmWikiStore {
  return new LlmWikiStore(db);
}

function mapTrendItem(row: TrendItemRow): TrendItem {
  return {
    id: row.id,
    canonicalUrl: row.canonical_url,
    canonicalHash: row.canonical_hash,
    title: row.title,
    sourceName: row.source_name,
    publishedAt: row.published_at
  };
}

function mapDigest(row: DigestRow): Digest {
  return {
    id: row.id,
    reportDate: row.report_date,
    timezone: row.timezone,
    generatedAt: row.generated_at
  };
}

function mapSourceEvidence(row: SourceEvidenceRow): SourceEvidence {
  return {
    id: row.id,
    trendItemId: row.trend_item_id,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    fetchedAt: row.fetched_at,
    evidenceExcerpt: row.evidence_excerpt,
    confidenceScore: row.confidence_score
  };
}

function mapTrendAssessment(row: TrendAssessmentRow): TrendAssessment {
  return {
    id: row.id,
    trendItemId: row.trend_item_id,
    reportDate: row.report_date,
    summary: row.summary,
    whyItMatters: row.why_it_matters,
    practicalImpact: row.practical_impact,
    trendCategory: row.trend_category,
    actionLevel: row.action_level,
    confirmationStatus: row.confirmation_status,
    confidence: row.confidence,
    importanceScore: row.importance_score,
    contradictionNotes: row.contradiction_notes,
    stalenessPolicy: row.staleness_policy,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTrendAssessmentLineage(row: TrendAssessmentLineageRow): TrendAssessmentLineage {
  return {
    assessmentId: row.assessment_id,
    sourceEvidenceId: row.source_evidence_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    confidenceScore: row.confidence_score
  };
}

function mapSlackDeliveryAttempt(row: SlackDeliveryAttemptRow): SlackDeliveryAttempt {
  return {
    id: row.id,
    reportDate: row.report_date,
    webhookHost: row.webhook_host,
    status: row.status,
    httpStatusCode: row.http_status_code,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    payloadHash: row.payload_hash
  };
}

function mapCronRun(row: CronRunRow): CronRun {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    reportDate: row.report_date,
    mode: row.mode,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    stepName: row.step_name,
    candidateCount: row.candidate_count,
    slackAttemptId: row.slack_attempt_id,
    errorMessage: row.error_message
  };
}

function mapLlmUsageLog(row: LlmUsageLogRow): LlmUsageLog {
  return {
    id: row.id,
    reportDate: row.report_date,
    purpose: row.purpose,
    providerName: row.provider_name,
    modelName: row.model_name,
    candidateCount: row.candidate_count,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    estimatedCostUsd: row.estimated_cost_usd,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at
  };
}

function mapSocialSignalItem(row: SocialSignalItemRow): SocialSignalItem {
  return {
    id: row.id,
    sourceId: row.source_id,
    platform: row.platform,
    authorHandle: row.author_handle,
    authorDisplayName: row.author_display_name,
    url: row.url,
    canonicalUrl: row.canonical_url,
    text: row.text,
    publishedAt: row.published_at,
    collectedAt: row.collected_at,
    outboundUrls: parseStringArray(row.outbound_urls_json, "outbound_urls_json"),
    confirmationStatus: row.confirmation_status,
    linkedOfficialEvidenceIds: parseStringArray(
      row.linked_official_evidence_ids_json,
      "linked_official_evidence_ids_json"
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseStringArray(value: string, label: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(`social_signal_items data drift: ${label} must be a string array`);
  }

  return parsed;
}

function getKstReportDateWindow(reportDate: string): { startUtc: string; endUtc: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new Error(`Invalid report date: ${reportDate}`);
  }

  const [year, month, day] = reportDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid report date: ${reportDate}`);
  }

  const start = new Date(Date.UTC(year, month - 1, day - 1, 15, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 15, 0, 0, 0));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid report date: ${reportDate}`);
  }

  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString()
  };
}
