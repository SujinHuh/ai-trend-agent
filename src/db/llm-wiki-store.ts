import type {
  ActionLevel,
  ConfirmationStatus,
  Digest,
  DigestCandidate,
  DigestWithItems,
  SourceEvidence,
  TrendAssessment,
  TrendAssessmentInput,
  TrendAssessmentLineage,
  TrendCategory,
  TrendItem
} from "../domain/types.js";
import {
  createDigestId,
  createEvidenceId,
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
