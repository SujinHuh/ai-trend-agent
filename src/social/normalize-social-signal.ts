import type { SocialConfirmationStatus, SocialSignalItem, SocialSignalSource } from "../domain/types.js";
import { createSocialSignalId } from "../identity/stable-id.js";
import { canonicalizeUrl } from "../url/canonicalize-url.js";

export interface RawSocialSignalInput {
  sourceId: string;
  authorHandle?: string | null;
  authorDisplayName?: string | null;
  url: string;
  text: string;
  publishedAt?: string | null;
  collectedAt?: string | null;
  outboundUrls?: string[] | undefined;
  provenance?: string | null;
  deleted?: boolean | undefined;
  private?: boolean | undefined;
  screenshotOnly?: boolean | undefined;
  privateChat?: boolean | undefined;
}

export function normalizeSocialSignal(
  source: SocialSignalSource,
  raw: RawSocialSignalInput,
  linkedOfficialEvidenceIds: string[] = []
): SocialSignalItem {
  if (raw.sourceId !== source.id) {
    throw new Error(`raw social item sourceId "${raw.sourceId}" does not match source "${source.id}"`);
  }
  assertManualImportPolicy(source, raw);
  const canonicalUrl = canonicalizeUrl(raw.url);
  const outboundUrls = [...new Set((raw.outboundUrls ?? extractOutboundUrls(raw.text)).map(canonicalizeUrl))];
  const confirmationStatus: SocialConfirmationStatus =
    linkedOfficialEvidenceIds.length > 0 ? "confirmed_by_official_link" : source.defaultConfirmationStatus;
  const collectedAt = raw.collectedAt ?? new Date().toISOString();

  return {
    id: createSocialSignalId({ sourceId: source.id, canonicalUrl, publishedAt: raw.publishedAt }),
    sourceId: source.id,
    platform: source.platform,
    authorHandle: raw.authorHandle ?? null,
    authorDisplayName: raw.authorDisplayName ?? null,
    url: raw.url,
    canonicalUrl,
    text: raw.text.trim(),
    publishedAt: raw.publishedAt ?? null,
    collectedAt,
    outboundUrls,
    confirmationStatus,
    linkedOfficialEvidenceIds,
    createdAt: collectedAt,
    updatedAt: collectedAt
  };
}

export function extractOutboundUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>)"']+/giu) ?? [];
  return matches.map((url) => url.replace(/[.,;:!?]+$/u, ""));
}

function assertManualImportPolicy(source: SocialSignalSource, raw: RawSocialSignalInput): void {
  if (source.collectionMethod !== "manual_export") {
    return;
  }
  if (raw.provenance === undefined || raw.provenance === null || raw.provenance.trim().length === 0) {
    throw new Error("manual social import requires source provenance");
  }
  if (!/^https:\/\//u.test(raw.url)) {
    throw new Error("manual social import requires a public https URL");
  }
  if (raw.deleted === true || raw.private === true || raw.screenshotOnly === true || raw.privateChat === true) {
    throw new Error("manual social import rejected deleted/private/screenshot/private chat content");
  }
}
