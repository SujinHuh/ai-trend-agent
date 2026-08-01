import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_CACHE_ROOT = ".cache/sources";
const DEFAULT_CACHE_TTL_MINUTES = 24 * 60;
const DEFAULT_RETRY_COUNT = 0;
const DEFAULT_BACKOFF_MS = 0;
const SENSITIVE_HEADER_NAMES = new Set([
  "api-key",
  "authorization",
  "cookie",
  "openai-api-key",
  "proxy-authorization",
  "set-cookie",
  "x-api-key"
]);

export interface SourceFetchConfig {
  timeoutMs: number;
  retryCount?: number;
  backoffMs?: number;
  cacheTtlMinutes?: number;
  headers?: Record<string, string>;
}

export interface FetchableSource {
  id: string;
  url: string;
  fetchConfig: SourceFetchConfig;
}

export interface SourceHttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export interface SourceCacheSnapshot {
  sourceId: string;
  fetchedAt: string;
  status: number;
  headers: Record<string, string | string[]>;
  body: string;
}

export interface SuccessfulSourceResult {
  ok: true;
  sourceId: string;
  fetchedAt: string;
  status: number;
  headers: Record<string, string | string[]>;
  body: string;
  cache: {
    hit: boolean;
    path: string;
  };
  attempts: number;
}

export interface FailedSourceResult {
  ok: false;
  sourceId: string;
  fetchedAt: string;
  itemCount: 0;
  errorMessage: string;
  status?: number;
  headers?: Record<string, string | string[]>;
  body?: string;
  cache: {
    hit: boolean;
    path: string;
  };
  attempts: number;
}

export type SourceResult = SuccessfulSourceResult | FailedSourceResult;

export type SourceFetcher = (
  request: {
    url: string;
    headers: Record<string, string>;
    signal: AbortSignal;
  }
) => Promise<SourceHttpResponse>;

export interface FetchSourceOptions {
  reportDate: string;
  forceRefresh?: boolean;
  cacheRoot?: string;
  fetcher?: SourceFetcher;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

export async function fetchSourceDocument(
  source: FetchableSource,
  options: FetchSourceOptions
): Promise<SourceResult> {
  const now = options.now ?? (() => new Date());
  const cachePath = getSourceCachePath({
    cacheRoot: options.cacheRoot ?? DEFAULT_CACHE_ROOT,
    reportDate: options.reportDate,
    sourceId: source.id
  });

  if (options.forceRefresh !== true) {
    const cached = await readFreshCache(source, cachePath, now());

    if (cached !== null) {
      return snapshotToResult({
        snapshot: cached,
        cachePath,
        cacheHit: true,
        attempts: 0
      });
    }
  }

  const fetcher = options.fetcher ?? defaultSourceFetcher;
  const sleep = options.sleep ?? defaultSleep;
  const retryCount = source.fetchConfig.retryCount ?? DEFAULT_RETRY_COUNT;
  const backoffMs = source.fetchConfig.backoffMs ?? DEFAULT_BACKOFF_MS;
  const maxAttempts = retryCount + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const fetchedAt = now().toISOString();

    try {
      const response = await fetchWithTimeout(source, fetcher);
      const snapshot: SourceCacheSnapshot = {
        sourceId: source.id,
        fetchedAt,
        status: response.status,
        headers: sanitizeHeaders(response.headers),
        body: response.body
      };

      if (isSuccessfulStatus(response.status)) {
        await writeCacheSnapshot(cachePath, snapshot);
        return snapshotToResult({
          snapshot,
          cachePath,
          cacheHit: false,
          attempts: attempt
        });
      }

      lastError = new Error(`Fetch failed with HTTP ${response.status}`);

      if (attempt === maxAttempts) {
        return {
          ok: false,
          sourceId: source.id,
          fetchedAt,
          itemCount: 0,
          errorMessage: `Fetch failed with HTTP ${response.status}`,
          status: response.status,
          headers: snapshot.headers,
          body: response.body,
          cache: {
            hit: false,
            path: cachePath
          },
          attempts: attempt
        };
      }

      if (backoffMs > 0) {
        await sleep(backoffMs);
      }
    } catch (error: unknown) {
      lastError = error;

      if (attempt < maxAttempts && backoffMs > 0) {
        await sleep(backoffMs);
      }
    }
  }

  return {
    ok: false,
    sourceId: source.id,
    fetchedAt: now().toISOString(),
    itemCount: 0,
    errorMessage: formatFetchError(lastError),
    cache: {
      hit: false,
      path: cachePath
    },
    attempts: maxAttempts
  };
}

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

export function getSourceCachePath(input: {
  cacheRoot?: string;
  reportDate: string;
  sourceId: string;
}): string {
  return join(input.cacheRoot ?? DEFAULT_CACHE_ROOT, input.reportDate, `${input.sourceId}.json`);
}

async function readFreshCache(
  source: FetchableSource,
  cachePath: string,
  now: Date
): Promise<SourceCacheSnapshot | null> {
  try {
    const raw = await readFile(cachePath, "utf8");
    const snapshot = JSON.parse(raw) as SourceCacheSnapshot;

    if (snapshot.sourceId !== source.id) {
      return null;
    }

    if (!isSuccessfulStatus(snapshot.status)) {
      return null;
    }

    const fetchedAt = Date.parse(snapshot.fetchedAt);

    if (Number.isNaN(fetchedAt)) {
      return null;
    }

    const ttlMinutes = source.fetchConfig.cacheTtlMinutes ?? DEFAULT_CACHE_TTL_MINUTES;
    const ageMs = now.getTime() - fetchedAt;
    return ageMs <= ttlMinutes * 60_000 ? snapshot : null;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function fetchWithTimeout(
  source: FetchableSource,
  fetcher: SourceFetcher
): Promise<SourceHttpResponse> {
  const controller = new AbortController();
  let timeout: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Fetch timed out after ${source.fetchConfig.timeoutMs}ms`));
    }, source.fetchConfig.timeoutMs);
  });

  try {
    return await Promise.race([
      fetcher({
        url: source.url,
        headers: source.fetchConfig.headers ?? {},
        signal: controller.signal
      }),
      timeoutPromise
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

function snapshotToResult(input: {
  snapshot: SourceCacheSnapshot;
  cachePath: string;
  cacheHit: boolean;
  attempts: number;
}): SourceResult {
  const { snapshot } = input;

  if (snapshot.status < 200 || snapshot.status >= 300) {
    return {
      ok: false,
      sourceId: snapshot.sourceId,
      fetchedAt: snapshot.fetchedAt,
      itemCount: 0,
      errorMessage: `Fetch failed with HTTP ${snapshot.status}`,
      status: snapshot.status,
      headers: snapshot.headers,
      body: snapshot.body,
      cache: {
        hit: input.cacheHit,
        path: input.cachePath
      },
      attempts: input.attempts
    };
  }

  return {
    ok: true,
    sourceId: snapshot.sourceId,
    fetchedAt: snapshot.fetchedAt,
    status: snapshot.status,
    headers: snapshot.headers,
    body: snapshot.body,
    cache: {
      hit: input.cacheHit,
      path: input.cachePath
    },
    attempts: input.attempts
  };
}

async function writeCacheSnapshot(
  cachePath: string,
  snapshot: SourceCacheSnapshot
): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | string[]> {
  const sanitized: Record<string, string | string[]> = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
      continue;
    }

    sanitized[name] = value;
  }

  return sanitized;
}

function formatFetchError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function defaultSourceFetcher(request: {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}): Promise<SourceHttpResponse> {
  const response = await fetch(request.url, {
    headers: request.headers,
    signal: request.signal
  });

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
