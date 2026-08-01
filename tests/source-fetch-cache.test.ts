import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  fetchSourceDocument,
  getSourceCachePath,
  type FetchableSource,
  type SourceFetcher
} from "../src/sources/fetch-cache.js";

const source: FetchableSource = {
  id: "openai-news",
  url: "https://openai.com/news/",
  fetchConfig: {
    timeoutMs: 100,
    retryCount: 1,
    backoffMs: 25,
    cacheTtlMinutes: 60
  }
};

describe("source fetch/cache layer", () => {
  it("writes a sanitized raw response snapshot to the report-date cache path", async () => {
    const cacheRoot = await createCacheRoot();
    const fetcher = vi.fn<SourceFetcher>().mockResolvedValue({
      status: 200,
      headers: {
        "content-type": "application/rss+xml",
        authorization: "Bearer secret",
        "x-api-key": "secret",
        "set-cookie": "session=secret"
      },
      body: "<rss />"
    });

    const result = await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher,
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      sourceId: "openai-news",
      fetchedAt: "2026-08-01T00:00:00.000Z",
      status: 200,
      body: "<rss />",
      cache: { hit: false },
      attempts: 1
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const snapshot = JSON.parse(
      await readFile(getSourceCachePath({ cacheRoot, reportDate: "2026-08-01", sourceId: source.id }), "utf8")
    ) as { headers: Record<string, string> };

    expect(snapshot.headers).toEqual({
      "content-type": "application/rss+xml"
    });
  });

  it("uses a fresh cache snapshot without calling the network", async () => {
    const cacheRoot = await createCacheRoot();
    const firstFetch = vi.fn<SourceFetcher>().mockResolvedValue({
      status: 200,
      headers: { etag: "v1" },
      body: "cached body"
    });

    await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher: firstFetch,
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    const secondFetch = vi.fn<SourceFetcher>();
    const result = await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher: secondFetch,
      now: fixedNow("2026-08-01T00:30:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      body: "cached body",
      cache: { hit: true },
      attempts: 0
    });
    expect(secondFetch).not.toHaveBeenCalled();
  });

  it("bypasses cache when force refresh is enabled", async () => {
    const cacheRoot = await createCacheRoot();

    await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher: vi.fn<SourceFetcher>().mockResolvedValue({
        status: 200,
        headers: {},
        body: "old body"
      }),
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    const forceFetch = vi.fn<SourceFetcher>().mockResolvedValue({
      status: 200,
      headers: {},
      body: "fresh body"
    });
    const result = await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      forceRefresh: true,
      fetcher: forceFetch,
      now: fixedNow("2026-08-01T00:05:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      body: "fresh body",
      cache: { hit: false },
      attempts: 1
    });
    expect(forceFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores an existing non-2xx cache snapshot and refetches", async () => {
    const cacheRoot = await createCacheRoot();
    const cachePath = getSourceCachePath({ cacheRoot, reportDate: "2026-08-01", sourceId: source.id });
    await mkdir(join(cacheRoot, "2026-08-01"), { recursive: true });
    await writeFile(
      cachePath,
      JSON.stringify({
        sourceId: source.id,
        fetchedAt: "2026-08-01T00:00:00.000Z",
        status: 503,
        headers: {},
        body: "cached outage"
      })
    );

    const fetcher = vi.fn<SourceFetcher>().mockResolvedValue({
      status: 200,
      headers: {},
      body: "recovered"
    });
    const result = await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher,
      now: fixedNow("2026-08-01T00:30:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      body: "recovered",
      cache: { hit: false },
      attempts: 1
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries failed fetches with configured backoff", async () => {
    const cacheRoot = await createCacheRoot();
    const sleep = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);
    const fetcher = vi
      .fn<SourceFetcher>()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: "recovered"
      });

    const result = await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher,
      sleep,
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      body: "recovered",
      attempts: 2
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it("retries non-2xx HTTP responses before caching the final successful response", async () => {
    const cacheRoot = await createCacheRoot();
    const sleep = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);
    const fetcher = vi
      .fn<SourceFetcher>()
      .mockResolvedValueOnce({
        status: 503,
        headers: {},
        body: "temporary outage"
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: "recovered"
      });

    const result = await fetchSourceDocument(source, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher,
      sleep,
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      ok: true,
      body: "recovered",
      attempts: 2
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it("returns a SourceResult failure for non-2xx HTTP responses", async () => {
    const cacheRoot = await createCacheRoot();
    const noRetrySource: FetchableSource = {
      ...source,
      fetchConfig: {
        ...source.fetchConfig,
        retryCount: 0
      }
    };
    const result = await fetchSourceDocument(noRetrySource, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher: vi.fn<SourceFetcher>().mockResolvedValue({
        status: 503,
        headers: { "retry-after": "60" },
        body: "unavailable"
      }),
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      ok: false,
      sourceId: "openai-news",
      itemCount: 0,
      status: 503,
      errorMessage: "Fetch failed with HTTP 503",
      body: "unavailable",
      attempts: 1
    });

    await expect(
      access(getSourceCachePath({ cacheRoot, reportDate: "2026-08-01", sourceId: noRetrySource.id }))
    ).rejects.toThrow();
  });

  it("returns a SourceResult failure after timeout and retry exhaustion", async () => {
    const cacheRoot = await createCacheRoot();
    const timeoutSource: FetchableSource = {
      ...source,
      fetchConfig: {
        timeoutMs: 1,
        retryCount: 1,
        backoffMs: 0,
        cacheTtlMinutes: 60
      }
    };
    const fetcher = vi.fn<SourceFetcher>(
      () => new Promise(() => undefined)
    );

    const result = await fetchSourceDocument(timeoutSource, {
      reportDate: "2026-08-01",
      cacheRoot,
      fetcher,
      now: fixedNow("2026-08-01T00:00:00.000Z")
    });

    expect(result).toMatchObject({
      ok: false,
      sourceId: "openai-news",
      itemCount: 0,
      errorMessage: "Fetch timed out after 1ms",
      cache: { hit: false },
      attempts: 2
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

async function createCacheRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "source-cache-"));
}

function fixedNow(isoDate: string): () => Date {
  return () => new Date(isoDate);
}
