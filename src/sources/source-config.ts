import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type SourceType = "rss" | "atom" | "html" | "github_releases";
export type SourceCategory = "llm_vendor" | "cloud" | "backend" | "developer_tool" | "open_source";
export type SourceCredibility = "official" | "official_aggregated" | "trusted_individual" | "community";
export type ParserType = "rss_parser" | "atom_parser" | "html_list_parser" | "github_releases_atom";

export interface RateLimitConfig {
  requestsPerMinute: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
}

export interface FetchConfig {
  timeoutMs: number;
  maxItemsPerFetch: number;
  cacheTtlMinutes: number;
}

export interface CanonicalizationRules {
  removeQueryParams: string[];
  stripFragment: boolean;
  stripTrailingSlash: boolean;
  forceHttps: boolean;
}

export interface HtmlParserConfig {
  listSelector: string;
  itemSelector: string;
  titleSelector: string;
  urlSelector: string;
  dateSelector: string;
  authorSelector?: string;
  excerptSelector?: string;
  dateFormatHint?: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  homepageUrl?: string;
  vendor?: string;
  official?: boolean;
  category: SourceCategory;
  credibility: SourceCredibility;
  parserType?: ParserType;
  timezone?: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  rateLimit?: RateLimitConfig;
  retry?: RetryConfig;
  fetchConfig: FetchConfig;
  canonicalizationRules?: CanonicalizationRules;
  htmlParserConfig?: HtmlParserConfig;
}

export interface NormalizedSourceConfig
  extends Omit<SourceConfig, "official" | "parserType" | "timezone" | "rateLimit" | "retry" | "canonicalizationRules"> {
  official: boolean;
  parserType: ParserType;
  timezone: string;
  rateLimit: RateLimitConfig;
  retry: RetryConfig;
  canonicalizationRules: CanonicalizationRules;
}

export interface LoadSourceConfigOptions {
  includeDisabled?: boolean;
}

export const DEFAULT_SOURCE_CONFIG_PATH = "config/sources.ai.official.json";

export const SOURCE_CONFIG_DEFAULTS = {
  official: true,
  timezone: "UTC",
  rateLimit: {
    requestsPerMinute: 12
  },
  retry: {
    maxAttempts: 2,
    backoffMs: 1000
  },
  canonicalizationRules: {
    removeQueryParams: ["utm_*", "fbclid", "gclid", "ref", "source"],
    stripFragment: true,
    stripTrailingSlash: true,
    forceHttps: true
  }
} as const;

export const PARSER_TYPE_BY_SOURCE_TYPE: Record<SourceType, ParserType> = {
  rss: "rss_parser",
  atom: "atom_parser",
  html: "html_list_parser",
  github_releases: "github_releases_atom"
};

const SOURCE_TYPES = new Set<SourceType>(["rss", "atom", "html", "github_releases"]);
const SOURCE_CATEGORIES = new Set<SourceCategory>(["llm_vendor", "cloud", "backend", "developer_tool", "open_source"]);
const SOURCE_CREDIBILITIES = new Set<SourceCredibility>([
  "official",
  "official_aggregated",
  "trusted_individual",
  "community"
]);
const PARSER_TYPES = new Set<ParserType>(["rss_parser", "atom_parser", "html_list_parser", "github_releases_atom"]);

export function loadSourceConfigs(
  configPath = DEFAULT_SOURCE_CONFIG_PATH,
  options: LoadSourceConfigOptions = {}
): NormalizedSourceConfig[] {
  const resolvedPath = resolve(configPath);
  const rawConfig = parseSourceConfigFile(resolvedPath);
  const normalized = normalizeSourceConfigs(rawConfig, resolvedPath);
  const filtered = options.includeDisabled === true ? normalized : normalized.filter((source) => source.enabled);

  return [...filtered].sort((left, right) => {
    const priorityComparison = right.priority - left.priority;
    return priorityComparison === 0 ? left.id.localeCompare(right.id) : priorityComparison;
  });
}

export function normalizeSourceConfigs(rawConfig: unknown, sourceLabel = "source config"): NormalizedSourceConfig[] {
  if (!Array.isArray(rawConfig)) {
    throw new Error(`${sourceLabel}: expected top-level JSON array of source configs`);
  }

  const seenIds = new Set<string>();
  return rawConfig.map((rawSource, index) => {
    const path = `source[${index}]`;
    const source = parseSource(rawSource, path);

    if (seenIds.has(source.id)) {
      throw new Error(`${path}.id: duplicate source id "${source.id}"`);
    }
    seenIds.add(source.id);

    return applySourceDefaults(source, path);
  });
}

export function resolveParserType(type: SourceType, parserType?: ParserType): ParserType {
  const expectedParserType = PARSER_TYPE_BY_SOURCE_TYPE[type];
  if (parserType !== undefined && parserType !== expectedParserType) {
    throw new Error(`parserType "${parserType}" is not compatible with source type "${type}"; expected "${expectedParserType}"`);
  }

  return parserType ?? expectedParserType;
}

export function getParserDispatch(source: Pick<SourceConfig, "type" | "parserType">): ParserType {
  return resolveParserType(source.type, source.parserType);
}

function parseSourceConfigFile(configPath: string): unknown {
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      throw new Error(`${configPath}: invalid JSON: ${error.message}`);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${configPath}: unable to read source config: ${message}`);
  }
}

function parseSource(rawSource: unknown, path: string): SourceConfig {
  if (!isRecord(rawSource)) {
    throw new Error(`${path}: expected source config object`);
  }

  const source: SourceConfig = {
    id: readRequiredString(rawSource, "id", path),
    name: readRequiredString(rawSource, "name", path),
    type: readEnum(rawSource, "type", path, SOURCE_TYPES),
    url: readRequiredUrl(rawSource, "url", path),
    category: readEnum(rawSource, "category", path, SOURCE_CATEGORIES),
    credibility: readEnum(rawSource, "credibility", path, SOURCE_CREDIBILITIES),
    enabled: readRequiredBoolean(rawSource, "enabled", path),
    priority: readRequiredNonNegativeNumber(rawSource, "priority", path),
    tags: readRequiredStringArray(rawSource, "tags", path),
    fetchConfig: readFetchConfig(rawSource.fetchConfig, `${path}.fetchConfig`)
  };

  const homepageUrl = readOptionalUrl(rawSource, "homepageUrl", path);
  if (homepageUrl !== undefined) {
    source.homepageUrl = homepageUrl;
  }

  const vendor = readOptionalString(rawSource, "vendor", path);
  if (vendor !== undefined) {
    source.vendor = vendor;
  }

  const official = readOptionalBoolean(rawSource, "official", path);
  if (official !== undefined) {
    source.official = official;
  }

  const parserType = readOptionalEnum(rawSource, "parserType", path, PARSER_TYPES);
  if (parserType !== undefined) {
    source.parserType = parserType;
  }

  const timezone = readOptionalString(rawSource, "timezone", path);
  if (timezone !== undefined) {
    source.timezone = timezone;
  }

  const rateLimit = readOptionalRateLimit(rawSource.rateLimit, `${path}.rateLimit`);
  if (rateLimit !== undefined) {
    source.rateLimit = rateLimit;
  }

  const retry = readOptionalRetry(rawSource.retry, `${path}.retry`);
  if (retry !== undefined) {
    source.retry = retry;
  }

  const canonicalizationRules = readOptionalCanonicalizationRules(
    rawSource.canonicalizationRules,
    `${path}.canonicalizationRules`
  );
  if (canonicalizationRules !== undefined) {
    source.canonicalizationRules = canonicalizationRules;
  }

  const htmlParserConfig = readOptionalHtmlParserConfig(rawSource.htmlParserConfig, `${path}.htmlParserConfig`);
  if (htmlParserConfig !== undefined) {
    source.htmlParserConfig = htmlParserConfig;
  }

  return source;
}

function applySourceDefaults(source: SourceConfig, path: string): NormalizedSourceConfig {
  const parserType = resolveParserType(source.type, source.parserType);
  if (source.type === "html" && source.htmlParserConfig === undefined) {
    throw new Error(`${path}.htmlParserConfig: required when type is "html"`);
  }

  return {
    ...source,
    official: source.official ?? SOURCE_CONFIG_DEFAULTS.official,
    parserType,
    timezone: source.timezone ?? SOURCE_CONFIG_DEFAULTS.timezone,
    rateLimit: source.rateLimit ?? { ...SOURCE_CONFIG_DEFAULTS.rateLimit },
    retry: source.retry ?? { ...SOURCE_CONFIG_DEFAULTS.retry },
    canonicalizationRules: source.canonicalizationRules ?? {
      removeQueryParams: [...SOURCE_CONFIG_DEFAULTS.canonicalizationRules.removeQueryParams],
      stripFragment: SOURCE_CONFIG_DEFAULTS.canonicalizationRules.stripFragment,
      stripTrailingSlash: SOURCE_CONFIG_DEFAULTS.canonicalizationRules.stripTrailingSlash,
      forceHttps: SOURCE_CONFIG_DEFAULTS.canonicalizationRules.forceHttps
    }
  };
}

function readFetchConfig(value: unknown, path: string): FetchConfig {
  if (!isRecord(value)) {
    throw new Error(`${path}: required object`);
  }

  return {
    timeoutMs: readRequiredPositiveNumber(value, "timeoutMs", path),
    maxItemsPerFetch: readRequiredPositiveNumber(value, "maxItemsPerFetch", path),
    cacheTtlMinutes: readRequiredPositiveNumber(value, "cacheTtlMinutes", path)
  };
}

function readOptionalRateLimit(value: unknown, path: string): RateLimitConfig | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path}: expected object`);
  }

  return {
    requestsPerMinute: readRequiredPositiveNumber(value, "requestsPerMinute", path)
  };
}

function readOptionalRetry(value: unknown, path: string): RetryConfig | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path}: expected object`);
  }

  return {
    maxAttempts: readRequiredNonNegativeNumber(value, "maxAttempts", path),
    backoffMs: readRequiredNonNegativeNumber(value, "backoffMs", path)
  };
}

function readOptionalCanonicalizationRules(value: unknown, path: string): CanonicalizationRules | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path}: expected object`);
  }

  return {
    removeQueryParams: readRequiredStringArray(value, "removeQueryParams", path),
    stripFragment: readRequiredBoolean(value, "stripFragment", path),
    stripTrailingSlash: readRequiredBoolean(value, "stripTrailingSlash", path),
    forceHttps: readRequiredBoolean(value, "forceHttps", path)
  };
}

function readOptionalHtmlParserConfig(value: unknown, path: string): HtmlParserConfig | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path}: expected object`);
  }

  const config: HtmlParserConfig = {
    listSelector: readRequiredString(value, "listSelector", path),
    itemSelector: readRequiredString(value, "itemSelector", path),
    titleSelector: readRequiredString(value, "titleSelector", path),
    urlSelector: readRequiredString(value, "urlSelector", path),
    dateSelector: readRequiredString(value, "dateSelector", path)
  };

  const authorSelector = readOptionalString(value, "authorSelector", path);
  if (authorSelector !== undefined) {
    config.authorSelector = authorSelector;
  }

  const excerptSelector = readOptionalString(value, "excerptSelector", path);
  if (excerptSelector !== undefined) {
    config.excerptSelector = excerptSelector;
  }

  const dateFormatHint = readOptionalString(value, "dateFormatHint", path);
  if (dateFormatHint !== undefined) {
    config.dateFormatHint = dateFormatHint;
  }

  return config;
}

function readRequiredString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path}.${key}: required non-empty string`);
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

function readRequiredUrl(record: Record<string, unknown>, key: string, path: string): string {
  const value = readRequiredString(record, key, path);
  validateUrl(value, `${path}.${key}`);
  return value;
}

function readOptionalUrl(record: Record<string, unknown>, key: string, path: string): string | undefined {
  const value = readOptionalString(record, key, path);
  if (value !== undefined) {
    validateUrl(value, `${path}.${key}`);
  }

  return value;
}

function readRequiredBoolean(record: Record<string, unknown>, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`${path}.${key}: required boolean`);
  }

  return value;
}

function readOptionalBoolean(record: Record<string, unknown>, key: string, path: string): boolean | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${path}.${key}: expected boolean`);
  }

  return value;
}

function readRequiredPositiveNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = readRequiredNumber(record, key, path);
  if (value <= 0) {
    throw new Error(`${path}.${key}: expected positive number`);
  }

  return value;
}

function readRequiredNonNegativeNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = readRequiredNumber(record, key, path);
  if (value < 0) {
    throw new Error(`${path}.${key}: expected non-negative number`);
  }

  return value;
}

function readRequiredNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path}.${key}: required finite number`);
  }

  return value;
}

function readRequiredStringArray(record: Record<string, unknown>, key: string, path: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${path}.${key}: required array of non-empty strings`);
  }

  return value.map((item) => item as string);
}

function readEnum<T extends string>(record: Record<string, unknown>, key: string, path: string, allowed: Set<T>): T {
  const value = record[key];
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(`${path}.${key}: expected one of ${formatAllowedValues(allowed)}`);
  }

  return value as T;
}

function readOptionalEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: Set<T>
): T | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(`${path}.${key}: expected one of ${formatAllowedValues(allowed)}`);
  }

  return value as T;
}

function validateUrl(value: string, path: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${path}: expected valid URL`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${path}: expected https URL`);
  }
}

function formatAllowedValues<T extends string>(allowed: Set<T>): string {
  return [...allowed].map((value) => `"${value}"`).join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
