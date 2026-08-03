import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { SocialSignalItem, SocialSignalSource } from "../domain/types.js";
import { fetchSourceDocument, type SourceFetcher, type SourceResult } from "../sources/fetch-cache.js";
import { matchOfficialEvidence } from "./match-official-evidence.js";
import { type HackerNewsItem, normalizeHackerNewsItems } from "./hacker-news-collector.js";
import { normalizeRedditRss } from "./reddit-rss-collector.js";

const HN_NEW_STORIES_URL = "https://hacker-news.firebaseio.com/v0/newstories.json";
const HN_ITEM_URL_PREFIX = "https://hacker-news.firebaseio.com/v0/item/";

export interface PollSocialSignalsOptions {
  reportDate: string;
  store: LlmWikiStore;
  sources: SocialSignalSource[];
  dryRun?: boolean;
  forceRefresh?: boolean;
  cacheRoot?: string;
  fetcher?: SourceFetcher;
  now?: () => Date;
}

export interface PollSocialSourceResult {
  sourceId: string;
  platform: SocialSignalSource["platform"];
  skipped: boolean;
  skipReason: string | null;
  fetchedCount: number;
  normalizedCount: number;
  savedCount: number;
  cacheHits: number;
  errors: string[];
  items: SocialSignalItem[];
}

export interface PollSocialSignalsResult {
  reportDate: string;
  dryRun: boolean;
  sourceCount: number;
  polledSourceCount: number;
  savedCount: number;
  results: PollSocialSourceResult[];
}

export async function pollSocialSignals(options: PollSocialSignalsOptions): Promise<PollSocialSignalsResult> {
  const dryRun = options.dryRun === true;
  const results: PollSocialSourceResult[] = [];

  for (const source of options.sources) {
    results.push(await pollSocialSource(source, options, dryRun));
  }

  return {
    reportDate: options.reportDate,
    dryRun,
    sourceCount: options.sources.length,
    polledSourceCount: results.filter((result) => !result.skipped).length,
    savedCount: results.reduce((sum, result) => sum + result.savedCount, 0),
    results
  };
}

async function pollSocialSource(
  source: SocialSignalSource,
  options: PollSocialSignalsOptions,
  dryRun: boolean
): Promise<PollSocialSourceResult> {
  if (!source.enabled) {
    return skipped(source, "source disabled");
  }
  if (source.security.requiresToken) {
    return skipped(source, "token-based live polling is deferred");
  }
  if (source.platform === "x" || source.platform === "threads") {
    return skipped(source, "x and threads live polling are deferred");
  }

  const collectedAt = (options.now ?? (() => new Date()))().toISOString();

  if (source.platform === "hacker_news") {
    return pollHackerNews(source, options, dryRun, collectedAt);
  }
  if (source.platform === "reddit") {
    return pollReddit(source, options, dryRun, collectedAt);
  }

  return skipped(source, `unsupported live polling platform: ${source.platform}`);
}

async function pollHackerNews(
  source: SocialSignalSource,
  options: PollSocialSignalsOptions,
  dryRun: boolean,
  collectedAt: string
): Promise<PollSocialSourceResult> {
  const errors: string[] = [];
  const cacheHits: boolean[] = [];
  const storyIdsResult = await fetchSocialDocument(source, source.id, HN_NEW_STORIES_URL, options);
  cacheHits.push(storyIdsResult.cache.hit);

  if (!storyIdsResult.ok) {
    return failed(source, cacheHits, errors.concat(storyIdsResult.errorMessage));
  }

  let storyIds: number[];
  try {
    storyIds = parseHackerNewsStoryIds(storyIdsResult.body).slice(0, source.livePolling.maxItemsPerFetch);
  } catch (error: unknown) {
    return failed(source, cacheHits, errors.concat(formatError(error)));
  }
  const items: HackerNewsItem[] = [];

  for (const storyId of storyIds) {
    const itemResult = await fetchSocialDocument(source, `${source.id}-item-${storyId}`, `${HN_ITEM_URL_PREFIX}${storyId}.json`, options);
    cacheHits.push(itemResult.cache.hit);

    if (!itemResult.ok) {
      errors.push(itemResult.errorMessage);
      continue;
    }

    try {
      items.push(parseHackerNewsItem(itemResult.body, storyId));
    } catch (error: unknown) {
      errors.push(formatError(error));
    }
  }

  const normalized = linkOfficialEvidence(
    source,
    normalizeHackerNewsItems({
      source,
      items,
      collectedAt
    }),
    options.store
  );
  const savedItems = dryRun ? normalized : options.store.saveSocialSignalItems(normalized);

  return {
    sourceId: source.id,
    platform: source.platform,
    skipped: false,
    skipReason: null,
    fetchedCount: items.length,
    normalizedCount: normalized.length,
    savedCount: dryRun ? 0 : savedItems.length,
    cacheHits: cacheHits.filter(Boolean).length,
    errors,
    items: savedItems
  };
}

async function pollReddit(
  source: SocialSignalSource,
  options: PollSocialSignalsOptions,
  dryRun: boolean,
  collectedAt: string
): Promise<PollSocialSourceResult> {
  const errors: string[] = [];
  const cacheHits: boolean[] = [];
  const normalized: SocialSignalItem[] = [];

  for (const subreddit of source.subreddits.slice(0, source.livePolling.maxItemsPerFetch)) {
    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/.rss?sort=new`;
    const result = await fetchSocialDocument(source, `${source.id}-${subreddit.toLowerCase()}`, url, options);
    cacheHits.push(result.cache.hit);

    if (!result.ok) {
      errors.push(result.errorMessage);
      continue;
    }

    normalized.push(
      ...normalizeRedditRss({
        source,
        xml: result.body,
        collectedAt
      }).slice(0, source.livePolling.maxItemsPerFetch)
    );
  }

  const linked = linkOfficialEvidence(source, normalized.slice(0, source.livePolling.maxItemsPerFetch), options.store);
  const savedItems = dryRun ? linked : options.store.saveSocialSignalItems(linked);

  return {
    sourceId: source.id,
    platform: source.platform,
    skipped: false,
    skipReason: null,
    fetchedCount: normalized.length,
    normalizedCount: linked.length,
    savedCount: dryRun ? 0 : savedItems.length,
    cacheHits: cacheHits.filter(Boolean).length,
    errors,
    items: savedItems
  };
}

async function fetchSocialDocument(
  source: SocialSignalSource,
  cacheId: string,
  url: string,
  options: PollSocialSignalsOptions
): Promise<SourceResult> {
  return fetchSourceDocument(
    {
      id: cacheId,
      url,
      fetchConfig: {
        timeoutMs: source.livePolling.timeoutMs,
        retryCount: source.livePolling.retryCount,
        backoffMs: source.livePolling.backoffMs,
        cacheTtlMinutes: source.livePolling.cacheTtlMinutes
      }
    },
    {
      reportDate: options.reportDate,
      ...(options.forceRefresh === undefined ? {} : { forceRefresh: options.forceRefresh }),
      ...(options.cacheRoot === undefined ? {} : { cacheRoot: options.cacheRoot }),
      ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
      ...(options.now === undefined ? {} : { now: options.now })
    }
  );
}

function linkOfficialEvidence(
  source: SocialSignalSource,
  items: SocialSignalItem[],
  store: LlmWikiStore
): SocialSignalItem[] {
  const allEvidence = store.findSourceEvidenceByCanonicalUrls(items.flatMap((item) => item.outboundUrls));
  return items.map((item) => {
    const matchedEvidence = matchOfficialEvidence({
      outboundUrls: item.outboundUrls,
      officialDomainsToConfirm: source.officialDomainsToConfirm,
      evidence: allEvidence
    });
    return {
      ...item,
      confirmationStatus: matchedEvidence.length > 0 ? "confirmed_by_official_link" : source.defaultConfirmationStatus,
      linkedOfficialEvidenceIds: matchedEvidence.map((evidence) => evidence.id)
    };
  });
}

function parseHackerNewsStoryIds(body: string): number[] {
  const parsed = JSON.parse(body) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "number" || !Number.isInteger(item))) {
    throw new Error("Hacker News newstories response must be an integer array");
  }
  return parsed;
}

function parseHackerNewsItem(body: string, storyId: number): HackerNewsItem {
  const parsed = JSON.parse(body) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`Hacker News item ${storyId} response must be an object`);
  }
  return parsed as unknown as HackerNewsItem;
}

function skipped(source: SocialSignalSource, reason: string): PollSocialSourceResult {
  return {
    sourceId: source.id,
    platform: source.platform,
    skipped: true,
    skipReason: reason,
    fetchedCount: 0,
    normalizedCount: 0,
    savedCount: 0,
    cacheHits: 0,
    errors: [],
    items: []
  };
}

function failed(source: SocialSignalSource, cacheHits: boolean[], errors: string[]): PollSocialSourceResult {
  return {
    sourceId: source.id,
    platform: source.platform,
    skipped: false,
    skipReason: null,
    fetchedCount: 0,
    normalizedCount: 0,
    savedCount: 0,
    cacheHits: cacheHits.filter(Boolean).length,
    errors,
    items: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
