import type { ConfirmationStatus, SourceEvidence, TrendCategory, TrendItem } from "../domain/types.js";
import { getMaxSourcePriority, hasOfficialLineage, type SourceMetadataByName } from "./source-lineage.js";

const CATEGORY_SCORE: Record<TrendCategory, number> = {
  model: 15,
  coding_agent: 15,
  product: 12,
  open_source: 10,
  benchmark: 10,
  infra: 8,
  safety: 8,
  research: 7,
  business: 5
};

const SIGNAL_PATTERN = /\b(release|launch|model|api|benchmark|open source|safety|agent|coding|eval|weights?)\b/i;

export function calculateImportanceScore(input: {
  trendItem: TrendItem;
  evidence: SourceEvidence[];
  reportDate: string;
  trendCategory: TrendCategory;
  confirmationStatus: ConfirmationStatus;
  metadataByName: SourceMetadataByName;
  socialSignalCount?: number;
}): number {
  let score = 0;

  score += hasOfficialLineage(input.evidence, input.metadataByName) ? 35 : input.evidence.length > 0 ? 15 : 0;
  score += hasSignalKeyword(input.trendItem, input.evidence) ? 15 : 0;
  score += getDateScore(input.trendItem.publishedAt, input.reportDate);
  score += CATEGORY_SCORE[input.trendCategory];
  score += Math.min(getMaxSourcePriority(input.evidence, input.metadataByName) * 2, 10);
  score += Math.min((input.socialSignalCount ?? 0) * 3, 6);

  if (input.confirmationStatus === "needs_confirmation") {
    score -= 20;
  }

  if (input.confirmationStatus === "conflicting") {
    score -= 40;
  }

  if (isStale(input.trendItem.publishedAt, input.reportDate)) {
    score -= 20;
  }

  return clamp(Math.round(score), 0, 100);
}

export function calculateConfidence(input: {
  evidence: SourceEvidence[];
  confirmationStatus: ConfirmationStatus;
  metadataByName: SourceMetadataByName;
}): number {
  const hasOfficial = hasOfficialLineage(input.evidence, input.metadataByName);
  let confidence = hasOfficial ? 0.85 : input.evidence.length > 0 ? 0.55 : 0.3;

  if (input.evidence.length > 1) {
    confidence += 0.05;
  }

  if (input.confirmationStatus === "needs_confirmation") {
    confidence = Math.min(confidence, 0.6);
  }

  if (input.confirmationStatus === "conflicting") {
    confidence = Math.min(confidence, 0.4);
  }

  return Math.round(clamp(confidence, 0, 1) * 100) / 100;
}

export function compareDigestCandidates(
  left: {
    importanceScore: number;
    confidence: number;
    publishedAt: string | null;
    trendItemId: string;
  },
  right: {
    importanceScore: number;
    confidence: number;
    publishedAt: string | null;
    trendItemId: string;
  }
): number {
  if (right.importanceScore !== left.importanceScore) {
    return right.importanceScore - left.importanceScore;
  }

  if (right.confidence !== left.confidence) {
    return right.confidence - left.confidence;
  }

  const leftPublishedAt = left.publishedAt ?? "";
  const rightPublishedAt = right.publishedAt ?? "";
  if (rightPublishedAt !== leftPublishedAt) {
    return rightPublishedAt.localeCompare(leftPublishedAt);
  }

  return left.trendItemId.localeCompare(right.trendItemId);
}

function hasSignalKeyword(trendItem: TrendItem, evidence: SourceEvidence[]): boolean {
  const text = [trendItem.title, ...evidence.map((item) => item.evidenceExcerpt ?? "")].join(" ");
  return SIGNAL_PATTERN.test(text);
}

function getDateScore(publishedAt: string | null, reportDate: string): number {
  if (publishedAt === null) {
    return 5;
  }

  if (isWithinKstReportDate(publishedAt, reportDate)) {
    return 20;
  }

  if (!isStale(publishedAt, reportDate, 3)) {
    return 10;
  }

  return 0;
}

function isWithinKstReportDate(publishedAt: string, reportDate: string): boolean {
  const published = new Date(publishedAt).getTime();
  const [year, month, day] = reportDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const start = Date.UTC(year, month - 1, day - 1, 15, 0, 0, 0);
  const end = Date.UTC(year, month - 1, day, 15, 0, 0, 0);

  return published >= start && published < end;
}

function isStale(publishedAt: string | null, reportDate: string, maxAgeDays = 14): boolean {
  if (publishedAt === null) {
    return false;
  }

  const reportStart = new Date(`${reportDate}T00:00:00.000Z`).getTime();
  const published = new Date(publishedAt).getTime();
  return reportStart - published > maxAgeDays * 24 * 60 * 60 * 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
