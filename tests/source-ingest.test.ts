import { mkdtemp } from "node:fs/promises";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { createTrendIdentity } from "../src/identity/stable-id.js";
import { ingestSources } from "../src/sources/ingest-sources.js";
import type { SourceFetcher } from "../src/sources/fetch-cache.js";
import { loadSourceConfigs, type NormalizedSourceConfig } from "../src/sources/source-config.js";

describe("ingestSources", () => {
  it("persists included official source items and reports partial source failures", async () => {
    const db = openSqliteDatabase(":memory:");
    const store = createLlmWikiStore(db);
    store.initialize();

    const fetcher = vi.fn<SourceFetcher>(async ({ url }) => {
      if (url.includes("failing")) {
        return { status: 503, headers: {}, body: "unavailable" };
      }

      return {
        status: 200,
        headers: { "content-type": "application/atom+xml" },
        body: [
          "<feed>",
          "<entry>",
          "<title>Gemini agent update</title>",
          "<link href=\"https://example.com/gemini-agent?utm_source=feed\" />",
          "<published>2026-07-31T16:00:00Z</published>",
          "<summary>Agent workflow update.</summary>",
          "</entry>",
          "<entry>",
          "<title>Old update</title>",
          "<link href=\"https://example.com/old\" />",
          "<published>2026-07-30T16:00:00Z</published>",
          "</entry>",
          "</feed>"
        ].join("")
      };
    });

    const result = await ingestSources(
      [source("google-blog-feed", "Google Blog Feed", "https://example.com/feed.atom"), source("failing", "Failing", "https://example.com/failing")],
      store,
      {
        reportDate: "2026-08-01",
        cacheRoot: await mkdtemp(join(tmpdir(), "source-ingest-cache-")),
        fetcher,
        now: () => new Date("2026-08-01T00:00:00.000Z")
      }
    );

    expect(result).toMatchObject({
      insertedOrUpdatedCount: 1,
      failedSourceCount: 1,
      includedItemCount: 1,
      excludedItemCount: 1
    });
    expect(result.sourceResults.map((sourceResult) => sourceResult.success)).toEqual([true, false]);

    const saved = store.getTrendItem(createTrendIdentity("https://example.com/gemini-agent").id);
    expect(saved).toMatchObject({
      canonicalUrl: "https://example.com/gemini-agent",
      title: "Gemini agent update",
      sourceName: "Google Blog Feed",
      publishedAt: "2026-07-31T16:00:00.000Z"
    });

    db.close();
  });

  it("enforces maxItemsPerFetch before persistence", async () => {
    const db = openSqliteDatabase(":memory:");
    const store = createLlmWikiStore(db);
    store.initialize();

    const fetcher = vi.fn<SourceFetcher>().mockResolvedValue({
      status: 200,
      headers: {},
      body: [
        "<feed>",
        "<entry><title>First</title><link href=\"https://example.com/first\" /><published>2026-07-31T16:00:00Z</published></entry>",
        "<entry><title>Second</title><link href=\"https://example.com/second\" /><published>2026-07-31T16:00:00Z</published></entry>",
        "</feed>"
      ].join("")
    });

    const limitedSource = {
      ...source("limited", "Limited", "https://example.com/feed.atom"),
      fetchConfig: {
        timeoutMs: 100,
        maxItemsPerFetch: 1,
        cacheTtlMinutes: 60
      }
    };

    const result = await ingestSources([limitedSource], store, {
      reportDate: "2026-08-01",
      cacheRoot: await mkdtemp(join(tmpdir(), "source-ingest-limit-cache-")),
      fetcher,
      now: () => new Date("2026-08-01T00:00:00.000Z")
    });

    expect(result.insertedOrUpdatedCount).toBe(1);
    expect(store.getTrendItem(createTrendIdentity("https://example.com/first").id)).not.toBeNull();
    expect(store.getTrendItem(createTrendIdentity("https://example.com/second").id)).toBeNull();

    db.close();
  });

  it("does not fetch sources from disabled domains", async () => {
    const configDir = mkdtempSync(join(tmpdir(), "source-ingest-domains-"));
    const configPath = join(configDir, "sources.json");
    writeFileSync(
      configPath,
      JSON.stringify([
        rawSource("ai-feed", "AI Feed", "ai"),
        rawSource("backend-feed", "Backend Feed", "backend")
      ])
    );
    const sources = loadSourceConfigs(configPath);
    const db = openSqliteDatabase(":memory:");
    const store = createLlmWikiStore(db);
    store.initialize();
    const fetcher = vi.fn<SourceFetcher>().mockResolvedValue({
      status: 200,
      headers: {},
      body: [
        "<feed>",
        "<entry><title>AI model release</title><link href=\"https://example.com/ai-model\" /><published>2026-07-31T16:00:00Z</published></entry>",
        "</feed>"
      ].join("")
    });

    try {
      const result = await ingestSources(sources, store, {
        reportDate: "2026-08-01",
        cacheRoot: await mkdtemp(join(tmpdir(), "source-ingest-domain-cache-")),
        fetcher
      });

      expect(sources.map((source) => source.id)).toEqual(["ai-feed"]);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.sourceResults.map((sourceResult) => sourceResult.sourceId)).toEqual(["ai-feed"]);
    } finally {
      db.close();
    }
  });
});

function rawSource(id: string, name: string, domain: "ai" | "backend") {
  return {
    id,
    name,
    domain,
    type: "atom",
    url: `https://example.com/${id}.atom`,
    category: "llm_vendor",
    credibility: "official",
    enabled: true,
    priority: 1,
    tags: [domain],
    fetchConfig: {
      timeoutMs: 100,
      maxItemsPerFetch: 10,
      cacheTtlMinutes: 1
    }
  };
}

function source(id: string, name: string, url: string): NormalizedSourceConfig {
  return {
    id,
    name,
    type: "atom",
    url,
    category: "llm_vendor",
    domain: "ai",
    credibility: "official",
    enabled: true,
    priority: 1,
    tags: ["ai"],
    fetchConfig: {
      timeoutMs: 100,
      maxItemsPerFetch: 10,
      cacheTtlMinutes: 60
    },
    official: true,
    parserType: "atom_parser",
    timezone: "UTC",
    rateLimit: {
      requestsPerMinute: 12
    },
    retry: {
      maxAttempts: 1,
      backoffMs: 0
    },
    canonicalizationRules: {
      removeQueryParams: ["utm_*", "fbclid", "gclid", "ref", "source"],
      stripFragment: true,
      stripTrailingSlash: true,
      forceHttps: true
    }
  };
}
