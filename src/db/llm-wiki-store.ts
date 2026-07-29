import type { Digest, DigestWithItems, SourceEvidence, TrendItem } from "../domain/types.js";
import {
  createDigestId,
  createEvidenceId,
  createTrendIdentity
} from "../identity/stable-id.js";
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
