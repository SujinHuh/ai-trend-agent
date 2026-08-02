import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { normalizeHackerNewsItems } from "../src/social/hacker-news-collector.js";
import { importManualSocialSignals } from "../src/social/manual-import.js";
import { normalizeRedditRss } from "../src/social/reddit-rss-collector.js";
import type { SocialSignalSource } from "../src/domain/types.js";

describe("social signal normalization", () => {
  it("imports public manual JSONL and promotes only by matched official evidence", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "social-manual-"));
    const db = openSqliteDatabase(join(tempDir, "wiki.sqlite"));
    const store = createLlmWikiStore(db);
    store.initialize();
    const trend = store.saveTrendItem({
      sourceUrl: "https://openai.com/news/agent-update?utm_source=rss",
      title: "OpenAI agent update",
      sourceName: "OpenAI News",
      publishedAt: "2026-08-02T00:00:00.000Z"
    });
    const evidence = store.saveSourceEvidence({
      trendItemId: trend.id,
      sourceUrl: "https://openai.com/news/agent-update",
      sourceName: "OpenAI News",
      fetchedAt: "2026-08-02T00:00:00.000Z",
      evidenceExcerpt: "Official agent update.",
      confidenceScore: 0.95
    });
    const inputPath = join(tempDir, "manual.jsonl");
    writeFileSync(
      inputPath,
      JSON.stringify({
        sourceId: "manual-public-ai-links",
        url: "https://example.com/public-signal",
        text: "OpenAI agent update https://openai.com/news/agent-update?utm_campaign=x",
        provenance: "user-public-link-export",
        outboundUrls: ["https://openai.com/news/agent-update?utm_campaign=x"],
        publishedAt: "2026-08-02T01:00:00.000Z"
      })
    );

    const result = importManualSocialSignals({ source: manualSource(), store, jsonlPath: inputPath });

    expect(result.importedCount).toBe(1);
    expect(result.items[0]?.confirmationStatus).toBe("confirmed_by_official_link");
    expect(result.items[0]?.linkedOfficialEvidenceIds).toEqual([evidence.id]);
    db.close();
  });

  it("matches official evidence on allowed subdomains", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "social-manual-subdomain-"));
    const db = openSqliteDatabase(join(tempDir, "wiki.sqlite"));
    const store = createLlmWikiStore(db);
    store.initialize();
    const trend = store.saveTrendItem({
      sourceUrl: "https://platform.openai.com/docs/agents",
      title: "OpenAI agent docs",
      sourceName: "OpenAI Docs",
      publishedAt: "2026-08-02T00:00:00.000Z"
    });
    const evidence = store.saveSourceEvidence({
      trendItemId: trend.id,
      sourceUrl: "https://platform.openai.com/docs/agents",
      sourceName: "OpenAI Docs",
      fetchedAt: "2026-08-02T00:00:00.000Z",
      evidenceExcerpt: "Official docs.",
      confidenceScore: 0.95
    });
    const inputPath = join(tempDir, "manual.jsonl");
    writeFileSync(
      inputPath,
      JSON.stringify({
        sourceId: "manual-public-ai-links",
        url: "https://example.com/public-subdomain-signal",
        text: "OpenAI docs https://platform.openai.com/docs/agents",
        provenance: "user-public-link-export",
        outboundUrls: ["https://platform.openai.com/docs/agents"]
      })
    );

    const result = importManualSocialSignals({ source: manualSource(), store, jsonlPath: inputPath });

    expect(result.items[0]?.linkedOfficialEvidenceIds).toEqual([evidence.id]);
    expect(result.items[0]?.confirmationStatus).toBe("confirmed_by_official_link");
    db.close();
  });

  it("does not partially persist manual imports when a later row is invalid", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "social-manual-atomic-"));
    const db = openSqliteDatabase(join(tempDir, "wiki.sqlite"));
    const store = createLlmWikiStore(db);
    store.initialize();
    const inputPath = join(tempDir, "manual.jsonl");
    writeFileSync(
      inputPath,
      [
        JSON.stringify({
          sourceId: "manual-public-ai-links",
          url: "https://example.com/public-ok",
          text: "Public AI signal",
          provenance: "public export"
        }),
        JSON.stringify({
          sourceId: "manual-public-ai-links",
          url: "https://example.com/public-bad",
          text: "Bad outbound",
          provenance: "public export",
          outboundUrls: ["not a url"]
        })
      ].join("\n")
    );

    expect(() => importManualSocialSignals({ source: manualSource(), store, jsonlPath: inputPath })).toThrow(
      /Invalid URL/u
    );
    expect(store.listSocialSignalItems()).toHaveLength(0);
    db.close();
  });

  it("rejects manual private or screenshot-only imports", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "social-manual-private-"));
    const db = openSqliteDatabase(join(tempDir, "wiki.sqlite"));
    const store = createLlmWikiStore(db);
    store.initialize();
    const inputPath = join(tempDir, "manual.jsonl");
    writeFileSync(
      inputPath,
      JSON.stringify({
        sourceId: "manual-public-ai-links",
        url: "https://example.com/private-signal",
        text: "private screenshot",
        provenance: "private chat",
        screenshotOnly: true
      })
    );

    expect(() => importManualSocialSignals({ source: manualSource(), store, jsonlPath: inputPath })).toThrow(
      /rejected deleted\/private\/screenshot\/private chat/u
    );
    db.close();
  });

  it("normalizes Hacker News fixture items and discards deleted or dead items", () => {
    const items = normalizeHackerNewsItems({
      source: hnSource(),
      collectedAt: "2026-08-02T00:00:00.000Z",
      items: [
        { id: 1, type: "story", by: "hnuser", time: 1785628800, title: "New LLM agent", url: "https://openai.com/news/a" },
        { id: 2, type: "story", title: "Dead LLM post", dead: true },
        { id: 3, type: "story", title: "Cooking discussion" }
      ]
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      platform: "hacker_news",
      confirmationStatus: "needs_confirmation",
      authorHandle: "hnuser"
    });
  });

  it("normalizes Reddit RSS fixture entries as unconfirmed social signals", () => {
    const items = normalizeRedditRss({
      source: redditSource(),
      collectedAt: "2026-08-02T00:00:00.000Z",
      xml: [
        "<feed>",
        "<entry>",
        "<title>Open source LLM agent release</title>",
        "<author><name>reddit_user</name></author>",
        "<updated>2026-08-02T00:00:00Z</updated>",
        "<link href=\"https://www.reddit.com/r/LocalLLaMA/comments/abc\" />",
        "<content>Discussion https://huggingface.co/example/model</content>",
        "</entry>",
        "</feed>"
      ].join("")
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.platform).toBe("reddit");
    expect(items[0]?.confirmationStatus).toBe("needs_confirmation");
    expect(items[0]?.outboundUrls).toEqual(["https://huggingface.co/example/model"]);
  });
});

function manualSource(): SocialSignalSource {
  return {
    id: "manual-public-ai-links",
    platform: "manual",
    displayName: "Manual",
    credibility: "trusted_individual",
    collectionMethod: "manual_export",
    enabled: false,
    defaultConfirmationStatus: "needs_confirmation",
    handles: [],
    accountIds: [],
    subreddits: [],
    keywords: ["ai"],
    officialDomainsToConfirm: ["openai.com"],
    policyReviewedAt: "2026-08-02",
    policyNotes: "public links only",
    rateLimit: { maxRequestsPerWindow: 1, windowSeconds: 60 },
    security: { requiresToken: false, secretEnvName: null }
  };
}

function hnSource(): SocialSignalSource {
  return {
    ...manualSource(),
    id: "hacker-news-ai",
    platform: "hacker_news",
    credibility: "community",
    collectionMethod: "api",
    keywords: ["llm", "agent"]
  };
}

function redditSource(): SocialSignalSource {
  return {
    ...manualSource(),
    id: "reddit-local-llama",
    platform: "reddit",
    credibility: "community",
    collectionMethod: "rss",
    keywords: ["llm", "agent"]
  };
}
