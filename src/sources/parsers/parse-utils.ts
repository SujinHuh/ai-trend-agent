import { createHash } from "node:crypto";

import { canonicalizeUrl } from "../../url/canonicalize-url.js";

export function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/gu, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function stripTags(value: string): string {
  return normalizeWhitespace(decodeEntities(unwrapCdata(value).replace(/<[^>]*>/gu, " ")));
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

export function resolveSourceUrl(rawUrl: string, baseUrl: string): string {
  return new URL(decodeEntities(rawUrl.trim()), baseUrl).toString();
}

export function parseDateValue(rawDate: string | null): string | null {
  if (rawDate === null || rawDate.trim().length === 0) {
    return null;
  }

  const normalized = decodeEntities(rawDate.trim());
  const timestamp = Date.parse(normalized);
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp).toISOString();
  }

  const extractedDate = extractDateCandidate(normalized);
  if (extractedDate === null) {
    return null;
  }

  const extractedTimestamp = Date.parse(extractedDate);
  return Number.isNaN(extractedTimestamp) ? null : new Date(extractedTimestamp).toISOString();
}

function extractDateCandidate(value: string): string | null {
  const monthDate = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+20\d{2}\b/iu.exec(value);
  if (monthDate?.[0] !== undefined) {
    return monthDate[0].replace(/\bSept\b/iu, "Sep");
  }

  const isoDate = /\b20\d{2}-\d{2}-\d{2}\b/u.exec(value);
  if (isoDate?.[0] !== undefined) {
    return isoDate[0];
  }

  return null;
}

export function parseStrictDateValue(rawDate: string | null): string | null {
  if (rawDate === null || rawDate.trim().length === 0) {
    return null;
  }

  const timestamp = Date.parse(decodeEntities(rawDate.trim()));
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function createCanonicalFields(url: string): { canonicalUrl: string; canonicalHash: string } {
  const canonicalUrl = canonicalizeUrl(url);
  const canonicalHash = createHash("sha256").update(canonicalUrl).digest("hex");
  return { canonicalUrl, canonicalHash };
}

export function dedupeByCanonicalUrl<T extends { canonicalUrl: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seen.has(item.canonicalUrl)) {
      continue;
    }

    seen.add(item.canonicalUrl);
    deduped.push(item);
  }

  return deduped;
}

function unwrapCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1");
}
