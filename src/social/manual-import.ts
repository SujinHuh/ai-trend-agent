import { readFileSync } from "node:fs";

import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { SocialSignalItem, SocialSignalSource } from "../domain/types.js";
import { matchOfficialEvidence } from "./match-official-evidence.js";
import { normalizeSocialSignal, type RawSocialSignalInput } from "./normalize-social-signal.js";

export interface ImportManualSocialSignalsResult {
  sourceId: string;
  importedCount: number;
  items: SocialSignalItem[];
}

export function importManualSocialSignals(input: {
  source: SocialSignalSource;
  store: LlmWikiStore;
  jsonlPath: string;
}): ImportManualSocialSignalsResult {
  if (input.source.collectionMethod !== "manual_export") {
    throw new Error(`source ${input.source.id} is not a manual_export source`);
  }

  const rows = readFileSync(input.jsonlPath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => parseManualRow(line, index + 1));

  const provisionalItems = rows.map((raw) => normalizeSocialSignal(input.source, raw));
  const allEvidence = input.store.findSourceEvidenceByCanonicalUrls(provisionalItems.flatMap((item) => item.outboundUrls));
  const normalizedItems = rows.map((raw, index) => {
    const provisional = provisionalItems[index];
    if (provisional === undefined) {
      throw new Error(`manual import row ${index + 1}: missing provisional normalized item`);
    }
    const matchedEvidence = matchOfficialEvidence({
      outboundUrls: provisional.outboundUrls,
      officialDomainsToConfirm: input.source.officialDomainsToConfirm,
      evidence: allEvidence
    });
    return normalizeSocialSignal(
      input.source,
      raw,
      matchedEvidence.map((evidence) => evidence.id)
    );
  });
  const items = input.store.saveSocialSignalItems(normalizedItems);

  return {
    sourceId: input.source.id,
    importedCount: items.length,
    items
  };
}

function parseManualRow(line: string, lineNumber: number): RawSocialSignalInput {
  const parsed = JSON.parse(line) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`manual import line ${lineNumber}: expected JSON object`);
  }
  return {
    sourceId: readString(parsed, "sourceId", lineNumber),
    url: readString(parsed, "url", lineNumber),
    text: readString(parsed, "text", lineNumber),
    provenance: readString(parsed, "provenance", lineNumber),
    authorHandle: readOptionalString(parsed, "authorHandle", lineNumber),
    authorDisplayName: readOptionalString(parsed, "authorDisplayName", lineNumber),
    publishedAt: readOptionalString(parsed, "publishedAt", lineNumber),
    collectedAt: readOptionalString(parsed, "collectedAt", lineNumber),
    outboundUrls: readOptionalStringArray(parsed, "outboundUrls", lineNumber),
    deleted: readOptionalBoolean(parsed, "deleted", lineNumber),
    private: readOptionalBoolean(parsed, "private", lineNumber),
    screenshotOnly: readOptionalBoolean(parsed, "screenshotOnly", lineNumber),
    privateChat: readOptionalBoolean(parsed, "privateChat", lineNumber)
  };
}

function readString(record: Record<string, unknown>, key: string, lineNumber: number): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`manual import line ${lineNumber}.${key}: expected non-empty string`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string, lineNumber: number): string | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`manual import line ${lineNumber}.${key}: expected non-empty string`);
  }
  return value;
}

function readOptionalStringArray(record: Record<string, unknown>, key: string, lineNumber: number): string[] | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`manual import line ${lineNumber}.${key}: expected string array`);
  }
  return value;
}

function readOptionalBoolean(record: Record<string, unknown>, key: string, lineNumber: number): boolean | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`manual import line ${lineNumber}.${key}: expected boolean`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
