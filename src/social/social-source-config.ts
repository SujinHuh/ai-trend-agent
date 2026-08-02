import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  SocialCollectionMethod,
  SocialCredibility,
  SocialPlatform,
  SocialSignalSource
} from "../domain/types.js";

export const DEFAULT_SOCIAL_SOURCE_CONFIG_PATH = "config/social-signals.json";

const PLATFORMS = new Set<SocialPlatform>(["x", "threads", "reddit", "hacker_news", "newsletter", "manual"]);
const CREDIBILITIES = new Set<SocialCredibility>(["trusted_individual", "official_social", "community"]);
const COLLECTION_METHODS = new Set<SocialCollectionMethod>(["api", "rss", "manual_export", "html_if_allowed"]);

export interface LoadSocialSourceConfigOptions {
  includeDisabled?: boolean;
}

export function loadSocialSignalSources(
  configPath = DEFAULT_SOCIAL_SOURCE_CONFIG_PATH,
  options: LoadSocialSourceConfigOptions = {}
): SocialSignalSource[] {
  const resolvedPath = resolve(configPath);
  const rawConfig = JSON.parse(readFileSync(resolvedPath, "utf8")) as unknown;
  const sources = normalizeSocialSignalSources(rawConfig, resolvedPath);
  const filtered = options.includeDisabled === true ? sources : sources.filter((source) => source.enabled);

  return [...filtered].sort((left, right) => left.id.localeCompare(right.id));
}

export function normalizeSocialSignalSources(rawConfig: unknown, sourceLabel = "social source config"): SocialSignalSource[] {
  if (!Array.isArray(rawConfig)) {
    throw new Error(`${sourceLabel}: expected top-level JSON array of social signal sources`);
  }

  const seenIds = new Set<string>();
  return rawConfig.map((rawSource, index) => {
    const path = `socialSource[${index}]`;
    if (!isRecord(rawSource)) {
      throw new Error(`${path}: expected source object`);
    }

    const source = parseSocialSignalSource(rawSource, path);
    if (seenIds.has(source.id)) {
      throw new Error(`${path}.id: duplicate source id "${source.id}"`);
    }
    seenIds.add(source.id);
    validateSourcePolicy(source, path);
    return source;
  });
}

function parseSocialSignalSource(rawSource: Record<string, unknown>, path: string): SocialSignalSource {
  return {
    id: readRequiredId(rawSource, "id", path),
    platform: readEnum(rawSource, "platform", path, PLATFORMS),
    displayName: readRequiredString(rawSource, "displayName", path),
    credibility: readEnum(rawSource, "credibility", path, CREDIBILITIES),
    collectionMethod: readEnum(rawSource, "collectionMethod", path, COLLECTION_METHODS),
    enabled: readRequiredBoolean(rawSource, "enabled", path),
    defaultConfirmationStatus: readLiteralNeedsConfirmation(rawSource, "defaultConfirmationStatus", path),
    handles: readOptionalStringArray(rawSource, "handles", path),
    accountIds: readOptionalStringArray(rawSource, "accountIds", path),
    subreddits: readOptionalStringArray(rawSource, "subreddits", path),
    keywords: readOptionalStringArray(rawSource, "keywords", path),
    officialDomainsToConfirm: readOptionalDomainArray(rawSource, "officialDomainsToConfirm", path),
    policyReviewedAt: readOptionalString(rawSource, "policyReviewedAt", path) ?? null,
    policyNotes: readOptionalString(rawSource, "policyNotes", path) ?? null,
    rateLimit: readRateLimit(rawSource.rateLimit, `${path}.rateLimit`),
    security: readSecurity(rawSource.security, `${path}.security`)
  };
}

function validateSourcePolicy(source: SocialSignalSource, path: string): void {
  if ((source.platform === "x" || source.platform === "threads") && source.enabled) {
    throw new Error(`${path}.enabled: ${source.platform} sources must stay disabled until token scopes and rate limits are reviewed`);
  }
  if (source.security.requiresToken && source.security.secretEnvName === null) {
    throw new Error(`${path}.security.secretEnvName: required when requiresToken is true`);
  }
  if (source.collectionMethod === "html_if_allowed" && source.enabled) {
    throw new Error(`${path}.enabled: html_if_allowed sources must stay disabled until platform permission is documented`);
  }
}

function readRateLimit(value: unknown, path: string): SocialSignalSource["rateLimit"] {
  if (!isRecord(value)) {
    throw new Error(`${path}: expected object`);
  }

  return {
    maxRequestsPerWindow: readPositiveInteger(value, "maxRequestsPerWindow", path),
    windowSeconds: readPositiveInteger(value, "windowSeconds", path)
  };
}

function readSecurity(value: unknown, path: string): SocialSignalSource["security"] {
  if (!isRecord(value)) {
    throw new Error(`${path}: expected object`);
  }

  return {
    requiresToken: readRequiredBoolean(value, "requiresToken", path),
    secretEnvName: readOptionalString(value, "secretEnvName", path) ?? null
  };
}

function readRequiredId(record: Record<string, unknown>, key: string, path: string): string {
  const value = readRequiredString(record, key, path);
  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(value)) {
    throw new Error(`${path}.${key}: expected lowercase id using letters, numbers, hyphen, or underscore`);
  }
  return value;
}

function readRequiredString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path}.${key}: expected non-empty string`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string, path: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path}.${key}: expected non-empty string`);
  }
  return value;
}

function readRequiredBoolean(record: Record<string, unknown>, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`${path}.${key}: expected boolean`);
  }
  return value;
}

function readPositiveInteger(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${path}.${key}: expected positive integer`);
  }
  return value;
}

function readLiteralNeedsConfirmation(
  record: Record<string, unknown>,
  key: string,
  path: string
): "needs_confirmation" {
  const value = record[key];
  if (value !== "needs_confirmation") {
    throw new Error(`${path}.${key}: expected "needs_confirmation"`);
  }
  return value;
}

function readEnum<T extends string>(record: Record<string, unknown>, key: string, path: string, allowed: Set<T>): T {
  const value = record[key];
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(`${path}.${key}: unsupported value "${String(value)}"`);
  }
  return value as T;
}

function readOptionalStringArray(record: Record<string, unknown>, key: string, path: string): string[] {
  const value = record[key];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${path}.${key}: expected string array`);
  }
  return value;
}

function readOptionalDomainArray(record: Record<string, unknown>, key: string, path: string): string[] {
  return readOptionalStringArray(record, key, path).map((domain) => domain.toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
