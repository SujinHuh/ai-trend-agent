import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import type { NormalizedSourceConfig } from "../src/sources/source-config.js";
import { createNewsHttpServer } from "../src/web/news-http.js";

const openServers: Array<{ close: (callback: () => void) => void }> = [];
const openDatabases: Array<{ close: () => void }> = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(resolve))));
  openDatabases.splice(0).forEach((db) => db.close());
});

describe("createNewsHttpServer", () => {
  it("renders the latest stored digest and configured public base path", async () => {
    const { url } = await startServer();
    const response = await fetch(`${url}/news`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(html).toContain("2026-08-03");
    expect(html).toContain("API release");
    expect(html).toContain('form action="/ai-trend-agent/news"');
  });

  it("applies query filters and returns empty state for a valid unknown source", async () => {
    const { url } = await startServer();
    const response = await fetch(`${url}/news?date=2026-08-03&source=Nope`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("조건에 맞는 신호가 없습니다");
  });

  it("wires combined search, domain, category, and source filters", async () => {
    const { url } = await startServer();
    const response = await fetch(
      `${url}/news?date=2026-08-03&q=API&domain=ai&category=coding_agent&source=Example+News`
    );
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("API release");
    expect(html).not.toContain("조건에 맞는 신호가 없습니다");
  });

  it.each([
    "date=2026-02-30",
    "domain=mobile",
    "category=unknown",
    "q=one&q=two",
    "unknown=true"
  ])("returns 400 for invalid query %s", async (query) => {
    const { url } = await startServer();
    const response = await fetch(`${url}/news?${query}`);
    expect(response.status).toBe(400);
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("returns a 200 empty page for a valid missing digest date", async () => {
    const { url } = await startServer();
    const response = await fetch(`${url}/news?date=2026-07-01`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("해당 날짜의 Digest가 없습니다");
  });

  it("supports health, HEAD, method rejection, and 404 without internal data", async () => {
    const { url } = await startServer();
    const health = await fetch(`${url}/healthz`);
    expect(await health.json()).toEqual({ ok: true, service: "ai-trend-news" });

    const head = await fetch(`${url}/news`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    const healthHead = await fetch(`${url}/healthz`, { method: "HEAD" });
    expect(healthHead.status).toBe(200);
    expect(healthHead.headers.get("content-type")).toContain("application/json");
    expect(await healthHead.text()).toBe("");

    const post = await fetch(`${url}/news`, { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
    expect(await post.json()).toEqual({ ok: false, error: "Only GET and HEAD are supported" });

    const missing = await fetch(`${url}/private`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain("digest_2026-08-03");
  });

  it("returns minimal 503 health and generic 500 news responses on store failures", async () => {
    const healthServer = await startServerWithStore({
      listDigestReportDates: () => {
        throw new Error("SQLITE secret path /private/wiki.sqlite");
      },
      getNewsDigestSnapshot: () => null
    });
    const health = await fetch(`${healthServer.url}/healthz`);
    expect(health.status).toBe(503);
    expect(await health.json()).toEqual({ ok: false, service: "ai-trend-news" });

    const newsServer = await startServerWithStore({
      listDigestReportDates: () => ["2026-08-03"],
      getNewsDigestSnapshot: () => {
        throw new Error("SQLITE secret path /private/wiki.sqlite");
      }
    });
    const news = await fetch(`${newsServer.url}/news`);
    const body = await news.text();
    expect(news.status).toBe(500);
    expect(body).toContain("뉴스 데이터를 읽지 못했습니다");
    expect(body).not.toContain("SQLITE");
    expect(body).not.toContain("/private/wiki.sqlite");
  });
});

async function startServer() {
  const db = openSqliteDatabase(":memory:");
  openDatabases.push(db);
  const store = createLlmWikiStore(db);
  store.initialize();
  const item = store.saveTrendItem({
    sourceUrl: "https://example.com/release",
    title: "API release",
    sourceName: "Example News",
    publishedAt: "2026-08-02T20:00:00.000Z"
  });
  store.saveDigest({
    reportDate: "2026-08-03",
    generatedAt: "2026-08-02T22:00:00.000Z",
    trendItemIds: [item.id]
  });
  const evidence = store.saveSourceEvidence({
    trendItemId: item.id,
    sourceUrl: item.canonicalUrl,
    sourceName: item.sourceName,
    fetchedAt: "2026-08-02T21:00:00.000Z",
    evidenceExcerpt: "Official API release",
    confidenceScore: 0.9
  });
  store.saveTrendAssessment({
    trendItemId: item.id,
    reportDate: "2026-08-03",
    summary: "API update summary",
    whyItMatters: "Agent compatibility",
    practicalImpact: "Review the API",
    trendCategory: "coding_agent",
    actionLevel: "do_next",
    confirmationStatus: "official_only",
    confidence: 0.9,
    importanceScore: 85,
    stalenessPolicy: "Recheck later",
    sourceEvidenceIds: [evidence.id]
  });
  const server = createNewsHttpServer({
    store,
    sources: [source()],
    publicBasePath: "/ai-trend-agent/news"
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  openServers.push(server);
  const address = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${address.port}` };
}

async function startServerWithStore(store: {
  listDigestReportDates: () => string[];
  getNewsDigestSnapshot: (reportDate: string) => null;
}) {
  const server = createNewsHttpServer({ store: store as never, sources: [] });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  openServers.push(server);
  const address = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${address.port}` };
}

function source(): NormalizedSourceConfig {
  return {
    id: "example-news",
    name: "Example News",
    type: "rss",
    url: "https://example.com/feed.xml",
    category: "developer_tool",
    credibility: "official",
    enabled: true,
    priority: 80,
    tags: ["api"],
    fetchConfig: { timeoutMs: 1000, maxItemsPerFetch: 10, cacheTtlMinutes: 60 },
    domain: "ai",
    official: true,
    parserType: "rss_parser",
    timezone: "UTC",
    rateLimit: { requestsPerMinute: 10 },
    retry: { maxAttempts: 1, backoffMs: 10 },
    canonicalizationRules: {
      removeQueryParams: [],
      stripFragment: true,
      stripTrailingSlash: true,
      forceHttps: true
    }
  };
}
