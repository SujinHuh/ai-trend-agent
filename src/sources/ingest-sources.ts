import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { NormalizedSourceConfig, ParserType } from "./source-config.js";
import { fetchSourceDocument, type FetchSourceOptions, type FetchableSource, type SourceFetcher } from "./fetch-cache.js";
import { parseGitHubReleasesAtom } from "./parsers/github-releases-parser.js";
import { parseHtmlList } from "./parsers/html-list-parser.js";
import { parseRssAtomFeed } from "./parsers/rss-atom-parser.js";
import type { ParsedSourceItem, ParseResult, SourceParserContext } from "./parsers/types.js";
import { normalizeSourceItems, type NormalizeSourceItemsResult } from "./normalize-source-item.js";

export interface SourceRunResult {
  sourceId: string;
  success: boolean;
  fetchedAt: string;
  itemCount: number;
  insertedOrUpdatedCount: number;
  cacheHit: boolean;
  cachePath: string;
  errorMessage?: string;
  skippedItemCount: number;
  needsReviewCount: number;
  excludedCount: number;
}

export interface IngestSourcesOptions {
  reportDate: string;
  forceRefresh?: boolean;
  cacheRoot?: string;
  fetcher?: SourceFetcher;
  now?: () => Date;
}

export interface IngestSourcesResult {
  reportDate: string;
  generatedAt: string;
  sourceResults: SourceRunResult[];
  insertedOrUpdatedCount: number;
  failedSourceCount: number;
  includedItemCount: number;
  needsReviewItemCount: number;
  excludedItemCount: number;
}

export async function ingestSources(
  sources: NormalizedSourceConfig[],
  store: LlmWikiStore,
  options: IngestSourcesOptions
): Promise<IngestSourcesResult> {
  const now = options.now ?? (() => new Date());
  const sourceResults: SourceRunResult[] = [];

  for (const source of sources) {
    sourceResults.push(await ingestSource(source, store, options));
  }

  return {
    reportDate: options.reportDate,
    generatedAt: now().toISOString(),
    sourceResults,
    insertedOrUpdatedCount: sourceResults.reduce((total, result) => total + result.insertedOrUpdatedCount, 0),
    failedSourceCount: sourceResults.filter((result) => !result.success).length,
    includedItemCount: sourceResults.reduce((total, result) => total + result.itemCount, 0),
    needsReviewItemCount: sourceResults.reduce((total, result) => total + result.needsReviewCount, 0),
    excludedItemCount: sourceResults.reduce((total, result) => total + result.excludedCount, 0)
  };
}

async function ingestSource(
  source: NormalizedSourceConfig,
  store: LlmWikiStore,
  options: IngestSourcesOptions
): Promise<SourceRunResult> {
  const fetchResult = await fetchSourceDocument(toFetchableSource(source), toFetchOptions(options));

  if (!fetchResult.ok) {
    return {
      sourceId: source.id,
      success: false,
      fetchedAt: fetchResult.fetchedAt,
      itemCount: 0,
      insertedOrUpdatedCount: 0,
      cacheHit: fetchResult.cache.hit,
      cachePath: fetchResult.cache.path,
      errorMessage: fetchResult.errorMessage,
      skippedItemCount: 0,
      needsReviewCount: 0,
      excludedCount: 0
    };
  }

  try {
    const parsed = parseSourceDocument(source, fetchResult.body);
    const limitedItems = parsed.items.slice(0, source.fetchConfig.maxItemsPerFetch);
    const normalized = normalizeSourceItems(limitedItems, { reportDate: options.reportDate });
    const insertedOrUpdatedCount = persistIncludedItems(normalized, store, fetchResult.fetchedAt);

    return {
      sourceId: source.id,
      success: true,
      fetchedAt: fetchResult.fetchedAt,
      itemCount: normalized.includedItems.length,
      insertedOrUpdatedCount,
      cacheHit: fetchResult.cache.hit,
      cachePath: fetchResult.cache.path,
      skippedItemCount: parsed.skippedItems.length,
      needsReviewCount: normalized.needsReviewItems.length,
      excludedCount: normalized.excludedItems.length
    };
  } catch (error: unknown) {
    return {
      sourceId: source.id,
      success: false,
      fetchedAt: fetchResult.fetchedAt,
      itemCount: 0,
      insertedOrUpdatedCount: 0,
      cacheHit: fetchResult.cache.hit,
      cachePath: fetchResult.cache.path,
      errorMessage: error instanceof Error ? error.message : String(error),
      skippedItemCount: 0,
      needsReviewCount: 0,
      excludedCount: 0
    };
  }
}

function parseSourceDocument(source: NormalizedSourceConfig, body: string): ParseResult {
  const context: SourceParserContext = {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url
  };

  switch (source.parserType satisfies ParserType) {
    case "rss_parser":
    case "atom_parser":
      return parseRssAtomFeed(body, context);
    case "github_releases_atom":
      return parseGitHubReleasesAtom(body, context);
    case "html_list_parser":
      if (source.htmlParserConfig === undefined) {
        throw new Error(`Missing htmlParserConfig for ${source.id}`);
      }
      return parseHtmlList(body, source.htmlParserConfig, context);
  }
}

function persistIncludedItems(
  normalized: NormalizeSourceItemsResult,
  store: LlmWikiStore,
  fetchedAt: string
): number {
  let count = 0;

  for (const item of normalized.includedItems) {
    const trendItem = store.saveTrendItem({
      sourceUrl: item.url,
      title: item.title,
      sourceName: item.sourceName,
      publishedAt: item.effectivePublishedAt
    });

    store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: item.url,
      sourceName: item.sourceName,
      fetchedAt,
      evidenceExcerpt: item.excerpt,
      confidenceScore: 0.8
    });

    count += 1;
  }

  return count;
}

function toFetchableSource(source: NormalizedSourceConfig): FetchableSource {
  return {
    id: source.id,
    url: source.url,
    fetchConfig: {
      timeoutMs: source.fetchConfig.timeoutMs,
      retryCount: Math.max(source.retry.maxAttempts - 1, 0),
      backoffMs: source.retry.backoffMs,
      cacheTtlMinutes: source.fetchConfig.cacheTtlMinutes,
      ...(source.fetchConfig.headers === undefined ? {} : { headers: source.fetchConfig.headers })
    }
  };
}

function toFetchOptions(options: IngestSourcesOptions): FetchSourceOptions {
  return {
    reportDate: options.reportDate,
    ...(options.forceRefresh === undefined ? {} : { forceRefresh: options.forceRefresh }),
    ...(options.cacheRoot === undefined ? {} : { cacheRoot: options.cacheRoot }),
    ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
    ...(options.now === undefined ? {} : { now: options.now })
  };
}

export type { ParsedSourceItem };
