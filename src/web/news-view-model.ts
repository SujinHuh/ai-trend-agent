import type { NewsDigestSnapshot, TrendCategory } from "../domain/types.js";
import {
  SOURCE_DOMAINS,
  type NormalizedSourceConfig,
  type SourceDomain
} from "../sources/source-config.js";

const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TREND_CATEGORIES: readonly TrendCategory[] = [
  "model",
  "coding_agent",
  "product",
  "open_source",
  "benchmark",
  "infra",
  "safety",
  "business",
  "research"
];
const MAX_QUERY_LENGTH = 120;

export class NewsViewQueryError extends Error {
  override readonly name = "NewsViewQueryError";
}

export interface NewsViewQuery {
  date?: string;
  q: string;
  domain?: SourceDomain;
  category?: TrendCategory;
  source?: string;
}

export interface NewsSourceMetadata {
  domain: SourceDomain;
  tags: string[];
}

export interface NewsViewItem {
  position: number;
  stableId: string;
  title: string;
  canonicalUrl: string;
  sourceName: string;
  publishedAt: string | null;
  domain: SourceDomain;
  sourceTags: string[];
  summary: string | null;
  whyItMatters: string | null;
  practicalImpact: string | null;
  trendCategory: TrendCategory | null;
  confirmationStatus: string | null;
  confidence: number | null;
  importanceScore: number | null;
}

export interface NewsPageModel {
  availableDates: string[];
  selectedDate: string | null;
  digestGeneratedAt: string | null;
  query: NewsViewQuery;
  totalCount: number;
  items: NewsViewItem[];
  filters: {
    domains: SourceDomain[];
    categories: TrendCategory[];
    sources: string[];
  };
}

export function parseNewsViewQuery(searchParams: URLSearchParams): NewsViewQuery {
  const allowedKeys = new Set(["date", "q", "domain", "category", "source"]);
  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) {
      throw new NewsViewQueryError(`Unsupported query parameter: ${key}`);
    }
    if (searchParams.getAll(key).length > 1) {
      throw new NewsViewQueryError(`Query parameter must appear once: ${key}`);
    }
  }

  const date = normalizeOptional(searchParams.get("date"));
  if (date !== undefined && !isValidReportDate(date)) {
    throw new NewsViewQueryError("date must be a valid YYYY-MM-DD calendar date");
  }

  const q = normalizeOptional(searchParams.get("q")) ?? "";
  const source = normalizeOptional(searchParams.get("source"));
  if (q.length > MAX_QUERY_LENGTH || (source?.length ?? 0) > MAX_QUERY_LENGTH) {
    throw new NewsViewQueryError(`q and source must be at most ${MAX_QUERY_LENGTH} characters`);
  }

  const domainValue = normalizeOptional(searchParams.get("domain"));
  const domain = domainValue === undefined ? undefined : parseDomain(domainValue);
  const categoryValue = normalizeOptional(searchParams.get("category"));
  const category = categoryValue === undefined ? undefined : parseCategory(categoryValue);

  return {
    ...(date === undefined ? {} : { date }),
    q,
    ...(domain === undefined ? {} : { domain }),
    ...(category === undefined ? {} : { category }),
    ...(source === undefined ? {} : { source })
  };
}

export function resolveNewsReportDate(availableDates: string[], requestedDate?: string): string | null {
  return requestedDate ?? availableDates[0] ?? null;
}

export function createNewsSourceMetadataIndex(
  sources: NormalizedSourceConfig[]
): ReadonlyMap<string, NewsSourceMetadata> {
  const index = new Map<string, NewsSourceMetadata>();
  for (const source of sources) {
    if (!index.has(source.name)) {
      index.set(source.name, {
        domain: source.domain,
        tags: [...new Set(source.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort()
      });
    }
  }
  return index;
}

export function buildNewsPageModel(input: {
  availableDates: string[];
  selectedDate: string | null;
  snapshot: NewsDigestSnapshot | null;
  query: NewsViewQuery;
  sources: NormalizedSourceConfig[];
}): NewsPageModel {
  const metadataBySource = createNewsSourceMetadataIndex(input.sources);
  const allItems = (input.snapshot?.entries ?? []).map((entry): NewsViewItem => {
    const metadata = metadataBySource.get(entry.trendItem.sourceName) ?? { domain: "ai" as const, tags: [] };
    return {
      position: entry.position,
      stableId: entry.trendItem.id,
      title: entry.trendItem.title,
      canonicalUrl: entry.trendItem.canonicalUrl,
      sourceName: entry.trendItem.sourceName,
      publishedAt: entry.trendItem.publishedAt,
      domain: metadata.domain,
      sourceTags: metadata.tags,
      summary: entry.assessment?.summary ?? null,
      whyItMatters: entry.assessment?.whyItMatters ?? null,
      practicalImpact: entry.assessment?.practicalImpact ?? null,
      trendCategory: entry.assessment?.trendCategory ?? null,
      confirmationStatus: entry.assessment?.confirmationStatus ?? null,
      confidence: entry.assessment?.confidence ?? null,
      importanceScore: entry.assessment?.importanceScore ?? null
    };
  });

  const sortedItems = [...allItems].sort(compareNewsItems);
  const searchTerm = input.query.q.toLocaleLowerCase("en-US");
  const items = sortedItems.filter((item) => {
    if (input.query.domain !== undefined && item.domain !== input.query.domain) {
      return false;
    }
    if (input.query.category !== undefined && item.trendCategory !== input.query.category) {
      return false;
    }
    if (input.query.source !== undefined && item.sourceName !== input.query.source) {
      return false;
    }
    return searchTerm.length === 0 || getSearchText(item).includes(searchTerm);
  });

  return {
    availableDates: [...input.availableDates],
    selectedDate: input.selectedDate,
    digestGeneratedAt: input.snapshot?.digest.generatedAt ?? null,
    query: input.query,
    totalCount: allItems.length,
    items,
    filters: {
      domains: [...new Set(allItems.map((item) => item.domain))].sort(),
      categories: [...new Set(allItems.flatMap((item) => item.trendCategory ?? []))].sort(),
      sources: [...new Set(allItems.map((item) => item.sourceName))].sort((left, right) => left.localeCompare(right))
    }
  };
}

function compareNewsItems(left: NewsViewItem, right: NewsViewItem): number {
  const importance = (right.importanceScore ?? -1) - (left.importanceScore ?? -1);
  if (importance !== 0) {
    return importance;
  }
  const confidence = (right.confidence ?? -1) - (left.confidence ?? -1);
  if (confidence !== 0) {
    return confidence;
  }
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return left.stableId.localeCompare(right.stableId);
}

function getSearchText(item: NewsViewItem): string {
  return [
    item.title,
    item.summary ?? "",
    item.whyItMatters ?? "",
    item.practicalImpact ?? "",
    item.sourceName,
    item.stableId,
    ...item.sourceTags
  ]
    .join(" ")
    .toLocaleLowerCase("en-US");
}

function normalizeOptional(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function parseDomain(value: string): SourceDomain {
  if (!(SOURCE_DOMAINS as readonly string[]).includes(value)) {
    throw new NewsViewQueryError(`domain must be one of: ${SOURCE_DOMAINS.join(", ")}`);
  }
  return value as SourceDomain;
}

function parseCategory(value: string): TrendCategory {
  if (!(TREND_CATEGORIES as readonly string[]).includes(value)) {
    throw new NewsViewQueryError(`category must be one of: ${TREND_CATEGORIES.join(", ")}`);
  }
  return value as TrendCategory;
}

function isValidReportDate(value: string): boolean {
  if (!REPORT_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
