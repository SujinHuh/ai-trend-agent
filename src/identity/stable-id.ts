import { createHash } from "node:crypto";

import { canonicalizeUrl } from "../url/canonicalize-url.js";

const HASH_PREFIX_LENGTH = 16;

export interface TrendIdentity {
  id: string;
  canonicalUrl: string;
  canonicalHash: string;
}

export function createCanonicalHash(canonicalUrl: string): string {
  return sha256(canonicalUrl);
}

export function createTrendItemId(canonicalUrl: string): string {
  return `trend_${createCanonicalHash(canonicalUrl).slice(0, HASH_PREFIX_LENGTH)}`;
}

export function createTrendIdentity(sourceUrl: string): TrendIdentity {
  const canonicalUrl = canonicalizeUrl(sourceUrl);
  const canonicalHash = createCanonicalHash(canonicalUrl);

  return {
    id: createTrendItemId(canonicalUrl),
    canonicalUrl,
    canonicalHash
  };
}

export function createDigestId(reportDate: string): string {
  return `digest_${reportDate}`;
}

export function createEvidenceId(input: {
  trendItemId: string;
  sourceUrl: string;
  sourceName?: string;
  fetchedAt?: string;
}): string {
  const hash = sha256(
    [input.trendItemId, canonicalizeUrl(input.sourceUrl), input.sourceName, input.fetchedAt].filter(Boolean).join("|")
  );
  return `evidence_${hash.slice(0, HASH_PREFIX_LENGTH)}`;
}

export function createTrendAssessmentId(input: { trendItemId: string; reportDate: string }): string {
  const hash = sha256([input.reportDate, input.trendItemId].join("|"));
  return `assessment_${hash.slice(0, HASH_PREFIX_LENGTH)}`;
}

export function createSlackDeliveryAttemptId(input: {
  reportDate: string;
  sentAt: string;
  payloadHash: string;
}): string {
  const hash = sha256([input.reportDate, input.sentAt, input.payloadHash].join("|"));
  return `slack_${hash.slice(0, HASH_PREFIX_LENGTH)}`;
}

export function createCronRunId(input: { idempotencyKey: string; startedAt: string }): string {
  const hash = sha256([input.idempotencyKey, input.startedAt].join("|"));
  return `cron_${hash.slice(0, HASH_PREFIX_LENGTH)}`;
}

export function createSocialSignalId(input: { sourceId: string; canonicalUrl: string; publishedAt?: string | null | undefined }): string {
  const hash = sha256([input.sourceId, input.canonicalUrl, input.publishedAt ?? ""].join("|"));
  return `social_${hash.slice(0, HASH_PREFIX_LENGTH)}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
