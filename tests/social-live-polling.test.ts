import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import type { SocialSignalSource } from "../src/domain/types.js";
import { pollSocialSignals } from "../src/social/live-polling.js";
import type { SourceFetcher } from "../src/sources/fetch-cache.js";

describe("social live polling", () => {
  it("does not fetch disabled sources", async () => {
    const { db, store } = createStore();
    const fetcher = vi.fn<SourceFetcher>();

    try {
      const result = await pollSocialSignals({
        store,
        sources: [{ ...hnSource(), enabled: false }],
        reportDate: "2026-08-03",
        fetcher
      });

      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        sourceCount: 1,
        polledSourceCount: 0,
        savedCount: 0,
        results: [{ skipped: true, skipReason: "source disabled" }]
      });
    } finally {
      db.close();
    }
  });

  it("polls Hacker News with item limit and preserves social-only needs_confirmation", async () => {
    const { db, store } = createStore();
    const fetcher = vi.fn<SourceFetcher>(async ({ url }) => {
      if (url.endsWith("/newstories.json")) {
        return okJson([101, 102]);
      }
      if (url.endsWith("/item/101.json")) {
        return okJson({
          id: 101,
          type: "story",
          by: "hnuser",
          time: 1785628800,
          title: "New LLM agent",
          url: "https://example.com/agent"
        });
      }
      if (url.endsWith("/item/102.json")) {
        return okJson({
          id: 102,
          type: "story",
          title: "Skipped by limit",
          url: "https://example.com/skipped"
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    try {
      const result = await pollSocialSignals({
        store,
        sources: [{ ...hnSource(), livePolling: { ...hnSource().livePolling, maxItemsPerFetch: 1 } }],
        reportDate: "2026-08-03",
        cacheRoot: mkdtempSync(join(tmpdir(), "social-hn-cache-")),
        fetcher,
        now: () => new Date("2026-08-03T00:00:00.000Z")
      });

      expect(result.savedCount).toBe(1);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(result.results[0]).toMatchObject({
        sourceId: "hacker-news-ai",
        fetchedCount: 1,
        normalizedCount: 1,
        savedCount: 1
      });
      expect(result.results[0]?.items[0]).toMatchObject({
        platform: "hacker_news",
        authorHandle: "hnuser",
        confirmationStatus: "needs_confirmation"
      });
      expect(store.listSocialSignalItems("hacker-news-ai")).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  it("reuses cached Hacker News responses on repeated polls", async () => {
    const { db, store } = createStore();
    const cacheRoot = mkdtempSync(join(tmpdir(), "social-hn-cache-hit-"));
    const fetcher = vi.fn<SourceFetcher>(async ({ url }) => {
      if (url.endsWith("/newstories.json")) {
        return okJson([101]);
      }
      if (url.endsWith("/item/101.json")) {
        return okJson({
          id: 101,
          type: "story",
          by: "hnuser",
          time: 1785628800,
          title: "Cached LLM agent",
          url: "https://example.com/cached-agent"
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    try {
      const input = {
        store,
        sources: [hnSource()],
        reportDate: "2026-08-03",
        cacheRoot,
        fetcher,
        now: () => new Date("2026-08-03T00:00:00.000Z")
      };

      const first = await pollSocialSignals(input);
      const second = await pollSocialSignals(input);

      expect(first.results[0]?.cacheHits).toBe(0);
      expect(second.results[0]?.cacheHits).toBe(2);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      db.close();
    }
  });

  it("reports malformed Hacker News JSON as a source-level error", async () => {
    const { db, store } = createStore();
    const fetcher = vi.fn<SourceFetcher>(async () => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "{\"not\":\"an array\"}"
    }));

    try {
      const result = await pollSocialSignals({
        store,
        sources: [hnSource()],
        reportDate: "2026-08-03",
        cacheRoot: mkdtempSync(join(tmpdir(), "social-hn-bad-cache-")),
        fetcher
      });

      expect(result.results[0]).toMatchObject({
        sourceId: "hacker-news-ai",
        fetchedCount: 0,
        normalizedCount: 0,
        savedCount: 0,
        errors: ["Hacker News newstories response must be an integer array"]
      });
      expect(store.listSocialSignalItems("hacker-news-ai")).toHaveLength(0);
    } finally {
      db.close();
    }
  });

  it("polls Reddit RSS as dry-run and links only explicit official evidence", async () => {
    const { db, store } = createStore();
    const trend = store.saveTrendItem({
      sourceUrl: "https://openai.com/news/live-agent",
      title: "OpenAI live agent",
      sourceName: "OpenAI News",
      publishedAt: "2026-08-03T00:00:00.000Z"
    });
    const evidence = store.saveSourceEvidence({
      trendItemId: trend.id,
      sourceUrl: "https://openai.com/news/live-agent",
      sourceName: "OpenAI News",
      fetchedAt: "2026-08-03T00:00:00.000Z",
      evidenceExcerpt: "Official live agent update.",
      confidenceScore: 0.95
    });
    const fetcher = vi.fn<SourceFetcher>(async () => ({
      status: 200,
      headers: { "content-type": "application/atom+xml" },
      body: [
        "<feed>",
        "<entry>",
        "<title>OpenAI live LLM agent discussion</title>",
        "<author><name>reddit_user</name></author>",
        "<updated>2026-08-03T00:00:00Z</updated>",
        "<link href=\"https://www.reddit.com/r/LocalLLaMA/comments/live\" />",
        "<content>Official link https://openai.com/news/live-agent?utm_source=reddit</content>",
        "</entry>",
        "</feed>"
      ].join("")
    }));

    try {
      const result = await pollSocialSignals({
        store,
        sources: [redditSource()],
        reportDate: "2026-08-03",
        dryRun: true,
        cacheRoot: mkdtempSync(join(tmpdir(), "social-reddit-cache-")),
        fetcher,
        now: () => new Date("2026-08-03T00:00:00.000Z")
      });

      expect(result.savedCount).toBe(0);
      expect(result.results[0]?.items[0]).toMatchObject({
        platform: "reddit",
        confirmationStatus: "confirmed_by_official_link",
        linkedOfficialEvidenceIds: [evidence.id]
      });
      expect(store.listSocialSignalItems("reddit-local-llama")).toHaveLength(0);
    } finally {
      db.close();
    }
  });
});

function createStore() {
  const tempDir = mkdtempSync(join(tmpdir(), "social-live-"));
  const db = openSqliteDatabase(join(tempDir, "wiki.sqlite"));
  const store = createLlmWikiStore(db);
  store.initialize();
  return { db, store };
}

function okJson(value: unknown) {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value)
  };
}

function hnSource(): SocialSignalSource {
  return {
    id: "hacker-news-ai",
    platform: "hacker_news",
    displayName: "Hacker News AI",
    credibility: "community",
    collectionMethod: "api",
    enabled: true,
    defaultConfirmationStatus: "needs_confirmation",
    handles: [],
    accountIds: [],
    subreddits: [],
    keywords: ["llm", "agent"],
    officialDomainsToConfirm: ["openai.com"],
    policyReviewedAt: "2026-08-02",
    policyNotes: "firebase api only",
    rateLimit: { maxRequestsPerWindow: 60, windowSeconds: 60 },
    livePolling: {
      pollingIntervalMinutes: 60,
      cacheTtlMinutes: 30,
      timeoutMs: 5000,
      maxItemsPerFetch: 10,
      retryCount: 0,
      backoffMs: 0
    },
    security: { requiresToken: false, secretEnvName: null }
  };
}

function redditSource(): SocialSignalSource {
  return {
    ...hnSource(),
    id: "reddit-local-llama",
    platform: "reddit",
    collectionMethod: "rss",
    subreddits: ["LocalLLaMA"]
  };
}
