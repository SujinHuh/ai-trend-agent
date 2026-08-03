import { describe, expect, it } from "vitest";

import type { NewsDigestSnapshot, TrendAssessment, TrendItem } from "../src/domain/types.js";
import type { NormalizedSourceConfig } from "../src/sources/source-config.js";
import {
  buildNewsPageModel,
  createNewsSourceMetadataIndex,
  parseNewsViewQuery,
  resolveNewsReportDate
} from "../src/web/news-view-model.js";

describe("news view model", () => {
  it("validates the public query contract", () => {
    expect(parseNewsViewQuery(new URLSearchParams("date=2026-08-03&q= agent &domain=ai&category=coding_agent&source=OpenAI"))).toEqual({
      date: "2026-08-03",
      q: "agent",
      domain: "ai",
      category: "coding_agent",
      source: "OpenAI"
    });
    expect(() => parseNewsViewQuery(new URLSearchParams("date=2026-02-30"))).toThrow(/valid YYYY-MM-DD/);
    expect(() => parseNewsViewQuery(new URLSearchParams("domain=mobile"))).toThrow(/domain/);
    expect(() => parseNewsViewQuery(new URLSearchParams("category=unknown"))).toThrow(/category/);
    expect(() => parseNewsViewQuery(new URLSearchParams("q=one&q=two"))).toThrow(/appear once/);
    expect(() => parseNewsViewQuery(new URLSearchParams("admin=true"))).toThrow(/Unsupported/);
    expect(() => parseNewsViewQuery(new URLSearchParams(`q=${"x".repeat(121)}`))).toThrow(/at most 120/);
    expect(() => parseNewsViewQuery(new URLSearchParams(`source=${"x".repeat(121)}`))).toThrow(/at most 120/);
    expect(parseNewsViewQuery(new URLSearchParams("q=+++&source=+++&domain=&category="))).toEqual({ q: "" });
  });

  it("uses the latest digest date unless a date is requested", () => {
    expect(resolveNewsReportDate(["2026-08-03", "2026-08-02"])).toBe("2026-08-03");
    expect(resolveNewsReportDate(["2026-08-03"], "2026-07-31")).toBe("2026-07-31");
    expect(resolveNewsReportDate([])).toBeNull();
  });

  it("builds deterministic top signals and combines search and filters", () => {
    const model = buildNewsPageModel({
      availableDates: ["2026-08-03"],
      selectedDate: "2026-08-03",
      snapshot: snapshot(),
      query: {
        q: "claude api",
        domain: "ai",
        category: "coding_agent",
        source: "Anthropic News"
      },
      sources: [source("Anthropic News", "ai", ["Claude", "API"]), source("Spring Blog", "backend", ["Java"])]
    });

    expect(model.totalCount).toBe(3);
    expect(model.items.map((item) => item.stableId)).toEqual(["trend_anthropic"]);
    expect(model.items[0]).toMatchObject({
      domain: "ai",
      sourceTags: ["api", "claude"],
      importanceScore: 90,
      confidence: 0.95
    });
    expect(model.filters).toEqual({
      domains: ["ai", "backend"],
      categories: ["coding_agent", "product"],
      sources: ["Anthropic News", "Spring Blog", "Unknown Source"]
    });
  });

  it("sorts by importance, confidence, and digest position and falls back for unknown sources", () => {
    const model = buildNewsPageModel({
      availableDates: ["2026-08-03"],
      selectedDate: "2026-08-03",
      snapshot: snapshot(),
      query: { q: "" },
      sources: [source("Anthropic News", "ai", ["Claude"]), source("Spring Blog", "backend", ["Java"])]
    });

    expect(model.items.map((item) => item.stableId)).toEqual([
      "trend_anthropic",
      "trend_spring",
      "trend_unknown"
    ]);
    expect(model.items[2]).toMatchObject({ domain: "ai", sourceTags: [], importanceScore: null });
  });

  it("applies confidence and digest position tie-breaks before null-last", () => {
    const data = snapshot();
    data.entries = [
      entry(4, item("trend_lower_conf", "Anthropic News", "Lower confidence"), assessment("trend_lower_conf", 80, 0.8, "product")),
      entry(3, item("trend_high_conf", "Anthropic News", "Higher confidence"), assessment("trend_high_conf", 80, 0.9, "product")),
      entry(1, item("trend_early_position", "Anthropic News", "Earlier position"), assessment("trend_early_position", 80, 0.8, "product")),
      entry(2, item("trend_null", "Unknown Source", "Unassessed"), null)
    ];
    const model = buildNewsPageModel({
      availableDates: ["2026-08-03"],
      selectedDate: "2026-08-03",
      snapshot: data,
      query: { q: "" },
      sources: [source("Anthropic News", "ai", ["Claude"])]
    });

    expect(model.items.map((item) => item.stableId)).toEqual([
      "trend_high_conf",
      "trend_early_position",
      "trend_lower_conf",
      "trend_null"
    ]);
  });

  it.each([
    ["summary-only-trend_anthropic", "trend_anthropic"],
    ["why-only-trend_spring", "trend_spring"],
    ["impact-only-trend_anthropic", "trend_anthropic"],
    ["unknown source", "trend_unknown"],
    ["trend_unknown", "trend_unknown"],
    ["claude", "trend_anthropic"]
  ])("searches every indexed field for %s", (q, expectedId) => {
    const model = buildNewsPageModel({
      availableDates: ["2026-08-03"],
      selectedDate: "2026-08-03",
      snapshot: snapshot(),
      query: { q },
      sources: [source("Anthropic News", "ai", ["Claude"]), source("Spring Blog", "backend", ["Java"])]
    });
    expect(model.items.map((item) => item.stableId)).toContain(expectedId);
  });

  it("keeps the first source metadata entry when registry names collide", () => {
    const metadata = createNewsSourceMetadataIndex([
      source("Same", "devops", ["Kubernetes"]),
      source("Same", "ai", ["Model"])
    ]);
    expect(metadata.get("Same")).toEqual({ domain: "devops", tags: ["kubernetes"] });
  });
});

function snapshot(): NewsDigestSnapshot {
  return {
    digest: {
      id: "digest_2026-08-03",
      reportDate: "2026-08-03",
      timezone: "Asia/Seoul",
      generatedAt: "2026-08-02T22:00:00.000Z"
    },
    entries: [
      entry(3, item("trend_unknown", "Unknown Source", "Misc note"), null),
      entry(2, item("trend_spring", "Spring Blog", "Spring release"), assessment("trend_spring", 70, 0.9, "product")),
      entry(1, item("trend_anthropic", "Anthropic News", "Claude API update"), assessment("trend_anthropic", 90, 0.95, "coding_agent"))
    ]
  };
}

function entry(position: number, trendItem: TrendItem, value: TrendAssessment | null) {
  return { position, trendItem, assessment: value, lineage: [] };
}

function item(id: string, sourceName: string, title: string): TrendItem {
  return {
    id,
    canonicalUrl: `https://example.com/${id}`,
    canonicalHash: `${id}_hash`,
    title,
    sourceName,
    publishedAt: "2026-08-02T20:00:00.000Z"
  };
}

function assessment(
  trendItemId: string,
  importanceScore: number,
  confidence: number,
  trendCategory: "coding_agent" | "product"
): TrendAssessment {
  return {
    id: `assessment_${trendItemId}`,
    trendItemId,
    reportDate: "2026-08-03",
    summary: `summary-only-${trendItemId}`,
    whyItMatters: `why-only-${trendItemId}`,
    practicalImpact: `impact-only-${trendItemId}`,
    trendCategory,
    actionLevel: "do_next",
    confirmationStatus: "official_only",
    confidence,
    importanceScore,
    contradictionNotes: null,
    stalenessPolicy: "Recheck later",
    createdAt: "2026-08-02T22:00:00.000Z",
    updatedAt: "2026-08-02T22:00:00.000Z"
  };
}

function source(name: string, domain: "ai" | "backend" | "devops", tags: string[]): NormalizedSourceConfig {
  return {
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    type: "rss",
    url: "https://example.com/feed.xml",
    category: "developer_tool",
    credibility: "official",
    enabled: true,
    priority: 80,
    tags,
    fetchConfig: { timeoutMs: 1000, maxItemsPerFetch: 10, cacheTtlMinutes: 60 },
    domain,
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
