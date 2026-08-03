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
  NewsDigestSnapshot,
  PersonalizationFeedback,
  PersonalizationFeedbackAction,
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
  TrendItem,
  UserInterestProfile
} from "../domain/types.js";
import {
  createCronRunId,
  createDigestId,
  createEvidenceId,
  createLlmUsageLogId,
  createPersonalizationFeedbackId,
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

interface NewsDigestItemRow extends TrendItemRow {
  position: number;
  assessment_id: string | null;
  assessment_report_date: string | null;
  summary: string | null;
  why_it_matters: string | null;
  practical_impact: string | null;
  trend_category: TrendCategory | null;
  action_level: ActionLevel | null;
  confirmation_status: ConfirmationStatus | null;
  confidence: number | null;
  importance_score: number | null;
  contradiction_notes: string | null;
  staleness_policy: string | null;
  assessment_created_at: string | null;
  assessment_updated_at: string | null;
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

interface UserInterestProfileRow {
  id: string;
  high_priority_tags_json: string;
  normal_priority_tags_json: string;
  muted_tags_json: string;
  enabled_domains_json: string;
  blocked_keywords_json: string;
  preferred_delivery_time: string;
  timezone: "Asia/Seoul";
  created_at: string;
  updated_at: string;
}

interface PersonalizationFeedbackRow {
  id: string;
  event_key: string;
  user_profile_id: string;
  trend_item_id: string;
  action: PersonalizationFeedbackAction;
  occurred_at: string;
  created_at: string;
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

export interface SaveUserInterestProfileInput {
  id: string;
  highPriorityTags?: string[];
  normalPriorityTags?: string[];
  mutedTags?: string[];
  enabledDomains?: Array<"ai" | "backend" | "frontend" | "devops">;
  blockedKeywords?: string[];
  preferredDeliveryTime?: string;
  updatedAt?: string;
}

export interface SavePersonalizationFeedbackInput {
  eventKey: string;
  userProfileId: string;
  trendItemId: string;
  action: PersonalizationFeedbackAction;
  occurredAt: string;
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

  listDigestReportDates(): string[] {
    return this.db
      .prepare("SELECT report_date FROM digests ORDER BY report_date DESC")
      .pluck()
      .all() as string[];
  }

  getNewsDigestSnapshot(reportDate: string): NewsDigestSnapshot | null {
    const digest = this.getDigest(reportDate);
    if (digest === null) {
      return null;
    }

    const rows = this.db
      .prepare(
        `
          SELECT
            dti.position,
            t.id,
            t.canonical_url,
            t.canonical_hash,
            t.title,
            t.source_name,
            t.published_at,
            ta.id AS assessment_id,
            ta.report_date AS assessment_report_date,
            ta.summary,
            ta.why_it_matters,
            ta.practical_impact,
            ta.trend_category,
            ta.action_level,
            ta.confirmation_status,
            ta.confidence,
            ta.importance_score,
            ta.contradiction_notes,
            ta.staleness_policy,
            ta.created_at AS assessment_created_at,
            ta.updated_at AS assessment_updated_at
          FROM digest_trend_items dti
          JOIN trend_items t ON t.id = dti.trend_item_id
          LEFT JOIN trend_assessments ta
            ON ta.trend_item_id = t.id
            AND ta.report_date = ?
          WHERE dti.digest_id = ?
          ORDER BY dti.position ASC, t.id ASC
        `
      )
      .all(reportDate, digest.id) as NewsDigestItemRow[];

    return {
      digest,
      entries: rows.map((row) => {
        const assessment = mapOptionalNewsAssessment(row);
        return {
          position: row.position,
          trendItem: mapTrendItem(row),
          assessment,
          lineage: assessment === null ? [] : this.listTrendAssessmentLineage(assessment.id)
        };
      })
    };
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

  listDigestCandidates(reportDate: string, limit?: number): DigestCandidate[] {
    const limitClause = limit === undefined ? "" : "LIMIT ?";
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
          ${limitClause}
        `
      )
      .all(...(limit === undefined ? [reportDate] : [reportDate, limit])) as TrendAssessmentRow[];

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

  getLatestTrendAssessmentForTrendItem(trendItemId: string): TrendAssessment | null {
    const row = this.db.prepare(
      `
        SELECT id, trend_item_id, report_date, summary, why_it_matters, practical_impact,
          trend_category, action_level, confirmation_status, confidence, importance_score,
          contradiction_notes, staleness_policy, created_at, updated_at
        FROM trend_assessments
        WHERE trend_item_id = ?
        ORDER BY report_date DESC, updated_at DESC
        LIMIT 1
      `
    ).get(trendItemId) as TrendAssessmentRow | undefined;
    return row === undefined ? null : mapTrendAssessment(row);
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

  saveUserInterestProfile(input: SaveUserInterestProfileInput): UserInterestProfile {
    const id = normalizeIdentifier(input.id, "profile id");
    const existing = this.getUserInterestProfile(id);
    const updatedAt = input.updatedAt ?? new Date().toISOString();
    const highPriorityTags = normalizePreferenceValues(input.highPriorityTags ?? existing?.highPriorityTags ?? []);
    const normalPriorityTags = normalizePreferenceValues(input.normalPriorityTags ?? existing?.normalPriorityTags ?? []);
    const mutedTags = normalizePreferenceValues(input.mutedTags ?? existing?.mutedTags ?? []);
    const blockedKeywords = normalizePreferenceValues(input.blockedKeywords ?? existing?.blockedKeywords ?? []);
    const enabledDomains = normalizeProfileDomains(input.enabledDomains ?? existing?.enabledDomains ?? ["ai"]);
    const preferredDeliveryTime = input.preferredDeliveryTime ?? existing?.preferredDeliveryTime ?? "07:00";
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(preferredDeliveryTime)) {
      throw new Error("preferredDeliveryTime must use HH:MM format");
    }

    this.db.prepare(
      `
        INSERT INTO user_interest_profiles (
          id, high_priority_tags_json, normal_priority_tags_json, muted_tags_json,
          enabled_domains_json, blocked_keywords_json, preferred_delivery_time,
          timezone, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Asia/Seoul', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          high_priority_tags_json = excluded.high_priority_tags_json,
          normal_priority_tags_json = excluded.normal_priority_tags_json,
          muted_tags_json = excluded.muted_tags_json,
          enabled_domains_json = excluded.enabled_domains_json,
          blocked_keywords_json = excluded.blocked_keywords_json,
          preferred_delivery_time = excluded.preferred_delivery_time,
          updated_at = excluded.updated_at
      `
    ).run(
      id,
      JSON.stringify(highPriorityTags),
      JSON.stringify(normalPriorityTags),
      JSON.stringify(mutedTags),
      JSON.stringify(enabledDomains),
      JSON.stringify(blockedKeywords),
      preferredDeliveryTime,
      existing?.createdAt ?? updatedAt,
      updatedAt
    );

    const profile = this.getUserInterestProfile(id);
    if (profile === null) {
      throw new Error(`UserInterestProfile was not saved: ${id}`);
    }
    return profile;
  }

  getUserInterestProfile(id: string): UserInterestProfile | null {
    const normalizedId = normalizeIdentifier(id, "profile id");
    const row = this.db.prepare(
      `
        SELECT id, high_priority_tags_json, normal_priority_tags_json, muted_tags_json,
          enabled_domains_json, blocked_keywords_json, preferred_delivery_time,
          timezone, created_at, updated_at
        FROM user_interest_profiles
        WHERE id = ?
      `
    ).get(normalizedId) as UserInterestProfileRow | undefined;
    return row === undefined ? null : mapUserInterestProfile(row);
  }

  savePersonalizationFeedback(input: SavePersonalizationFeedbackInput): PersonalizationFeedback {
    const eventKey = normalizeIdentifier(input.eventKey, "feedback event key", 200);
    const userProfileId = normalizeIdentifier(input.userProfileId, "profile id");
    if (!(["interested", "save_later", "hide"] as string[]).includes(input.action)) {
      throw new Error(`Unsupported feedback action: ${input.action}`);
    }
    const occurredAtDate = new Date(input.occurredAt);
    if (Number.isNaN(occurredAtDate.getTime())) {
      throw new Error("occurredAt must be an ISO date-time");
    }
    const occurredAt = occurredAtDate.toISOString();
    const existing = this.getPersonalizationFeedbackByEventKey(eventKey);
    if (existing !== null) {
      if (
        existing.userProfileId !== userProfileId ||
        existing.trendItemId !== input.trendItemId ||
        existing.action !== input.action
      ) {
        throw new Error(`Feedback event key already exists with different content: ${eventKey}`);
      }
      return existing;
    }
    if (this.getUserInterestProfile(userProfileId) === null) {
      throw new Error(`Unknown user profile: ${userProfileId}`);
    }
    if (this.getTrendItem(input.trendItemId) === null) {
      throw new Error(`Unknown TrendItem: ${input.trendItemId}`);
    }
    const id = createPersonalizationFeedbackId(eventKey);
    this.db.prepare(
      `
        INSERT INTO personalization_feedback (
          id, event_key, user_profile_id, trend_item_id, action, occurred_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_key) DO NOTHING
      `
    ).run(id, eventKey, userProfileId, input.trendItemId, input.action, occurredAt, new Date().toISOString());

    const feedback = this.getPersonalizationFeedbackByEventKey(eventKey);
    if (feedback === null) {
      throw new Error(`Personalization feedback was not saved: ${eventKey}`);
    }
    if (
      feedback.userProfileId !== userProfileId ||
      feedback.trendItemId !== input.trendItemId ||
      feedback.action !== input.action
    ) {
      throw new Error(`Feedback event key already exists with different content: ${eventKey}`);
    }
    return feedback;
  }

  getPersonalizationFeedbackByEventKey(eventKey: string): PersonalizationFeedback | null {
    const normalizedEventKey = normalizeIdentifier(eventKey, "feedback event key", 200);
    const row = this.db.prepare(
      `
        SELECT id, event_key, user_profile_id, trend_item_id, action, occurred_at, created_at
        FROM personalization_feedback
        WHERE event_key = ?
      `
    ).get(normalizedEventKey) as PersonalizationFeedbackRow | undefined;
    return row === undefined ? null : mapPersonalizationFeedback(row);
  }

  listPersonalizationFeedback(userProfileId: string, occurredBefore?: string): PersonalizationFeedback[] {
    const normalizedId = normalizeIdentifier(userProfileId, "profile id");
    const cutoff = occurredBefore === undefined ? undefined : normalizeIsoDateTime(occurredBefore, "feedback cutoff");
    const rows = this.db.prepare(
      `
        SELECT id, event_key, user_profile_id, trend_item_id, action, occurred_at, created_at
        FROM personalization_feedback
        WHERE user_profile_id = ?
          ${cutoff === undefined ? "" : "AND occurred_at < ?"}
        ORDER BY occurred_at DESC, id DESC
      `
    ).all(...(cutoff === undefined ? [normalizedId] : [normalizedId, cutoff])) as PersonalizationFeedbackRow[];
    return rows.map(mapPersonalizationFeedback);
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

function mapOptionalNewsAssessment(row: NewsDigestItemRow): TrendAssessment | null {
  if (row.assessment_id === null) {
    return null;
  }

  if (
    row.assessment_report_date === null ||
    row.summary === null ||
    row.why_it_matters === null ||
    row.practical_impact === null ||
    row.trend_category === null ||
    row.action_level === null ||
    row.confirmation_status === null ||
    row.confidence === null ||
    row.importance_score === null ||
    row.staleness_policy === null ||
    row.assessment_created_at === null ||
    row.assessment_updated_at === null
  ) {
    throw new Error(`Incomplete TrendAssessment row for news item: ${row.id}`);
  }

  return mapTrendAssessment({
    id: row.assessment_id,
    trend_item_id: row.id,
    report_date: row.assessment_report_date,
    summary: row.summary,
    why_it_matters: row.why_it_matters,
    practical_impact: row.practical_impact,
    trend_category: row.trend_category,
    action_level: row.action_level,
    confirmation_status: row.confirmation_status,
    confidence: row.confidence,
    importance_score: row.importance_score,
    contradiction_notes: row.contradiction_notes,
    staleness_policy: row.staleness_policy,
    created_at: row.assessment_created_at,
    updated_at: row.assessment_updated_at
  });
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

function mapUserInterestProfile(row: UserInterestProfileRow): UserInterestProfile {
  return {
    id: row.id,
    highPriorityTags: parseStringArray(row.high_priority_tags_json, "high_priority_tags_json"),
    normalPriorityTags: parseStringArray(row.normal_priority_tags_json, "normal_priority_tags_json"),
    mutedTags: parseStringArray(row.muted_tags_json, "muted_tags_json"),
    enabledDomains: normalizeProfileDomains(parseStringArray(row.enabled_domains_json, "enabled_domains_json")),
    blockedKeywords: parseStringArray(row.blocked_keywords_json, "blocked_keywords_json"),
    preferredDeliveryTime: row.preferred_delivery_time,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPersonalizationFeedback(row: PersonalizationFeedbackRow): PersonalizationFeedback {
  return {
    id: row.id,
    eventKey: row.event_key,
    userProfileId: row.user_profile_id,
    trendItemId: row.trend_item_id,
    action: row.action,
    occurredAt: row.occurred_at,
    createdAt: row.created_at
  };
}

function normalizeIdentifier(value: string, label: string, maxLength = 100): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength || /[\r\n\0]/.test(normalized)) {
    throw new Error(`${label} must be between 1 and ${maxLength} safe characters`);
  }
  return normalized;
}

function normalizePreferenceValues(values: string[]): string[] {
  if (values.length > 100) {
    throw new Error("preference arrays may contain at most 100 values");
  }
  const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (normalized.some((value) => value.length > 80 || /[\r\n\0]/.test(value))) {
    throw new Error("preference values must contain at most 80 safe characters");
  }
  return [...new Set(normalized)].sort();
}

function normalizeProfileDomains(values: string[]): Array<"ai" | "backend" | "frontend" | "devops"> {
  const allowed = new Set(["ai", "backend", "frontend", "devops"]);
  const normalized = normalizePreferenceValues(values);
  if (normalized.length === 0 || normalized.some((value) => !allowed.has(value))) {
    throw new Error("enabledDomains must contain ai, backend, frontend, or devops");
  }
  return normalized as Array<"ai" | "backend" | "frontend" | "devops">;
}

function parseStringArray(value: string, label: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(`JSON data drift: ${label} must be a string array`);
  }

  return parsed;
}

function normalizeIsoDateTime(value: string, label: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be an ISO date-time`);
  }
  return date.toISOString();
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
