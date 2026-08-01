import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { parseGitHubReleasesAtom } from "../src/sources/parsers/github-releases-parser.js";
import { parseHtmlList } from "../src/sources/parsers/html-list-parser.js";
import { parseRssAtomFeed } from "../src/sources/parsers/rss-atom-parser.js";

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/sources/${name}`, import.meta.url), "utf8");
}

describe("parseRssAtomFeed", () => {
  it("parses Google Blog Atom entries and skips malformed entries without aborting", () => {
    const result = parseRssAtomFeed(fixture("google-blog.atom"), {
      sourceId: "google-blog-ai",
      sourceName: "Google Blog AI",
      sourceUrl: "https://blog.google/technology/ai/"
    });

    expect(result.items).toHaveLength(2);
    expect(result.skippedItems).toEqual([{ index: 2, reason: "missing link" }]);
    expect(result.items[0]).toMatchObject({
      title: "Gemini CLI adds agentic coding workflows",
      url: "https://blog.google/technology/ai/gemini-cli-agentic-coding/?utm_source=feed",
      canonicalUrl: "https://blog.google/technology/ai/gemini-cli-agentic-coding",
      rawId: "tag:blog.google,2026:gemini-cli",
      publishedAtRaw: "2026-07-30T15:00:00Z",
      publishedAt: "2026-07-30T15:00:00.000Z",
      updatedAtRaw: "2026-07-30T16:15:00Z",
      updatedAt: "2026-07-30T16:15:00.000Z",
      effectivePublishedAt: "2026-07-30T15:00:00.000Z",
      author: "Google AI",
      excerpt: "New command line workflows for developers building with Gemini."
    });
    expect(result.items[1]?.publishedAt).toBeNull();
    expect(result.items[1]?.effectivePublishedAt).toBe("2026-07-30T12:00:00.000Z");
    expect(result.items[1]?.excerpt).toBe("Research updates with multi-step assistance.");
  });

  it("fails when an RSS/Atom source returns non-feed HTML", () => {
    expect(() =>
      parseRssAtomFeed("<html><body>not a feed</body></html>", {
        sourceId: "google-blog-feed",
        sourceName: "Google Blog Feed",
        sourceUrl: "https://blog.google/feed/"
      })
    ).toThrow("RSS/Atom parser found no entry or item blocks");
  });

  it("allows valid feed documents with no current entries", () => {
    const result = parseRssAtomFeed("<rss><channel><title>Empty feed</title></channel></rss>", {
      sourceId: "empty-feed",
      sourceName: "Empty Feed",
      sourceUrl: "https://example.com/feed.xml"
    });

    expect(result).toEqual({
      items: [],
      skippedItems: []
    });
  });
});

describe("parseGitHubReleasesAtom", () => {
  it("parses OpenAI Python releases, tags developer tooling, and dedupes canonical URLs", () => {
    const result = parseGitHubReleasesAtom(fixture("openai-python-releases.atom"), {
      sourceId: "openai-python-releases",
      sourceName: "OpenAI Python Releases",
      sourceUrl: "https://github.com/openai/openai-python/releases.atom"
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.title)).toEqual(["v2.0.0", "v1.99.0"]);
    expect(result.items[0]).toMatchObject({
      url: "https://github.com/openai/openai-python/releases/tag/v2.0.0",
      canonicalUrl: "https://github.com/openai/openai-python/releases/tag/v2.0.0",
      updatedAt: "2026-07-29T17:30:00.000Z",
      effectivePublishedAt: "2026-07-29T17:30:00.000Z",
      excerpt: "Major client update with API ergonomics improvements.",
      tags: ["developer_tool"]
    });
  });

  it("produces release items that can be saved as TrendItem and SourceEvidence", () => {
    const db = openSqliteDatabase(":memory:");
    const store = createLlmWikiStore(db);
    store.initialize();

    const release = parseGitHubReleasesAtom(fixture("openai-python-releases.atom"), {
      sourceId: "openai-python-releases",
      sourceName: "OpenAI Python Releases",
      sourceUrl: "https://github.com/openai/openai-python/releases.atom"
    }).items[0];

    if (release === undefined) {
      throw new Error("Expected at least one release item");
    }

    const trendItem = store.saveTrendItem({
      sourceUrl: release.url,
      title: release.title,
      sourceName: release.sourceName,
      publishedAt: release.effectivePublishedAt
    });
    const evidence = store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: release.url,
      sourceName: release.sourceName,
      fetchedAt: "2026-08-01T00:00:00.000Z",
      evidenceExcerpt: release.excerpt,
      confidenceScore: 0.9
    });

    expect(trendItem.canonicalUrl).toBe(release.canonicalUrl);
    expect(evidence.sourceUrl).toBe(release.url);
    expect(evidence.evidenceExcerpt).toBe(release.excerpt);
    db.close();
  });
});

describe("parseHtmlList", () => {
  it("parses OpenAI News cards without including duplicate navigation links", () => {
    const result = parseHtmlList(
      fixture("openai-news.html"),
      {
        itemSelector: "article.news-card",
        titleSelector: ".headline",
        urlSelector: "a.story-link",
        dateSelector: "time",
        authorSelector: ".byline",
        excerptSelector: ".summary"
      },
      {
        sourceId: "openai-news",
        sourceName: "OpenAI News",
        sourceUrl: "https://openai.com/news/"
      }
    );

    expect(result.items).toHaveLength(2);
    expect(result.skippedItems).toEqual([]);
    expect(result.items[0]).toMatchObject({
      title: "OpenAI launches a new agent toolkit",
      url: "https://openai.com/news/product-launch/?utm_campaign=homepage",
      canonicalUrl: "https://openai.com/news/product-launch",
      publishedAt: "2026-07-31T00:00:00.000Z",
      author: "OpenAI",
      excerpt: "Tools for developers shipping agentic applications."
    });
    expect(result.items.map((item) => item.title)).not.toContain("Product launch");
  });

  it("supports self href extraction for Anthropic list cards", () => {
    const result = parseHtmlList(
      fixture("anthropic-news.html"),
      {
        itemSelector: "a.update-card",
        titleSelector: "h2",
        urlSelector: "self",
        dateSelector: ".date",
        excerptSelector: ".excerpt"
      },
      {
        sourceId: "anthropic-news",
        sourceName: "Anthropic News",
        sourceUrl: "https://www.anthropic.com/news"
      }
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      title: "Claude Code adds enterprise controls",
      url: "https://www.anthropic.com/news/claude-code-enterprise",
      publishedAt: "2026-07-27T00:00:00.000Z",
      excerpt: "Admin controls and audit surfaces for larger engineering teams."
    });
    expect(result.items[1]?.canonicalUrl).toBe("https://www.anthropic.com/news/context-windows");
  });

  it("treats item selector drift as a source-level failure", () => {
    expect(() =>
      parseHtmlList(
        fixture("openai-news.html"),
        {
          itemSelector: ".missing-card",
          titleSelector: ".headline",
          urlSelector: "a"
        },
        {
          sourceId: "openai-news",
          sourceName: "OpenAI News",
          sourceUrl: "https://openai.com/news/"
        }
      )
    ).toThrow('HTML parser selector failed: itemSelector ".missing-card" matched 0 nodes');
  });

  it("supports configured attribute contains selectors used by enabled HTML sources", () => {
    const result = parseHtmlList(
      '<main><a href="/news/product-launch"><span>Product launch</span></a><a href="/careers">Careers</a></main>',
      {
        itemSelector: "a[href*='/news/']",
        titleSelector: "self",
        urlSelector: "self"
      },
      {
        sourceId: "openai-news",
        sourceName: "OpenAI News",
        sourceUrl: "https://openai.com/news/"
      }
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: "Product launch",
      url: "https://openai.com/news/product-launch"
    });
  });

  it("extracts date text embedded in a selected card", () => {
    const result = parseHtmlList(
      '<main><a href="/news/model-update"><span>Model update</span><span>Jul 30, 2026</span></a></main>',
      {
        itemSelector: "a[href*='/news/']",
        titleSelector: "self",
        urlSelector: "self",
        dateSelector: "self"
      },
      {
        sourceId: "anthropic-news",
        sourceName: "Anthropic News",
        sourceUrl: "https://www.anthropic.com/news"
      }
    );

    expect(result.items[0]).toMatchObject({
      publishedAt: "2026-07-30T00:00:00.000Z",
      effectivePublishedAt: "2026-07-30T00:00:00.000Z"
    });
  });
});
