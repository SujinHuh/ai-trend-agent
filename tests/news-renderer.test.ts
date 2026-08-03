import { describe, expect, it } from "vitest";

import type { NewsPageModel } from "../src/web/news-view-model.js";
import { buildNewsUrl, renderNewsPage } from "../src/web/render-news-page.js";

describe("renderNewsPage", () => {
  it("renders ranked metadata, analysis, and safe external links", () => {
    const html = renderNewsPage(model());

    expect(html).toContain("Top Signals");
    expect(html).toContain("Claude API update");
    expect(html).toContain("Importance</small><strong>91");
    expect(html).toContain("Confidence</small><strong>93%");
    expect(html).toContain("trend_anthropic");
    expect(html).toContain('href="https://example.com/release"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("@media(max-width:760px)");
    expect(html).toContain('aria-labelledby="signals-title"');
    expect(html).toContain('<ol class="signal-list" role="list">');
  });

  it("escapes DB and query strings and rejects non-http source links", () => {
    const value = model();
    value.query.q = '\"><script>alert(1)</script>';
    value.items[0]!.title = "<img src=x onerror=alert(1)>";
    value.items[0]!.canonicalUrl = "javascript:alert(1)";
    value.items[0]!.stableId = "<stable>";

    const html = renderNewsPage(value);

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("javascript:alert(1)");
    expect(html).toContain("&lt;stable&gt;");
    expect(html).toContain("원문 링크 없음");
  });

  it("preserves filters across adjacent digest navigation and handles boundaries", () => {
    const html = renderNewsPage(model());
    expect(html).toContain("/news?date=2026-08-02&amp;q=agent&amp;domain=ai&amp;category=coding_agent&amp;source=Anthropic+News");
    expect(html).toContain('aria-disabled="true">다음</span>');

    const oldest = model();
    oldest.selectedDate = "2026-08-02";
    const oldestHtml = renderNewsPage(oldest);
    expect(oldestHtml).toContain('aria-disabled="true">이전</span>');
    expect(oldestHtml).toContain("/news?date=2026-08-03");
  });

  it("renders distinct no-digest and filtered empty states", () => {
    const missing = model();
    missing.digestGeneratedAt = null;
    missing.items = [];
    missing.totalCount = 0;
    expect(renderNewsPage(missing)).toContain("해당 날짜의 Digest가 없습니다");

    const filtered = model();
    filtered.items = [];
    expect(renderNewsPage(filtered)).toContain("조건에 맞는 신호가 없습니다");

    const noDates = model();
    noDates.selectedDate = null;
    noDates.digestGeneratedAt = null;
    noDates.items = [];
    noDates.totalCount = 0;
    expect(renderNewsPage(noDates)).toContain("아직 생성된 Digest가 없습니다");
  });

  it("creates canonical news URLs without empty filters", () => {
    expect(buildNewsUrl({ date: "2026-08-03", q: "", source: "Anthropic News" })).toBe(
      "/news?date=2026-08-03&source=Anthropic+News"
    );
    expect(buildNewsUrl({})).toBe("/news");
    expect(buildNewsUrl({ date: "2026-08-03" }, "/ai-trend-agent/news")).toBe(
      "/ai-trend-agent/news?date=2026-08-03"
    );
    expect(renderNewsPage(model(), { basePath: "/ai-trend-agent/news" })).toContain(
      'form action="/ai-trend-agent/news"'
    );
  });

  it("keeps active date and filters visible when they are outside current options", () => {
    const value = model();
    value.selectedDate = "2026-07-01";
    value.query = {
      date: "2026-07-01",
      q: "",
      domain: "devops",
      category: "research",
      source: "Historical Source"
    };
    const html = renderNewsPage(value);
    expect(html).toContain('<option value="2026-07-01" selected>2026-07-01</option>');
    expect(html).toContain('<option value="devops" selected>DevOps</option>');
    expect(html).toContain('<option value="research" selected>Research</option>');
    expect(html).toContain('<option value="Historical Source" selected>Historical Source</option>');
  });
});

function model(): NewsPageModel {
  return {
    availableDates: ["2026-08-03", "2026-08-02"],
    selectedDate: "2026-08-03",
    digestGeneratedAt: "2026-08-02T22:00:00.000Z",
    query: {
      date: "2026-08-03",
      q: "agent",
      domain: "ai",
      category: "coding_agent",
      source: "Anthropic News"
    },
    totalCount: 1,
    filters: {
      domains: ["ai"],
      categories: ["coding_agent"],
      sources: ["Anthropic News"]
    },
    items: [
      {
        position: 1,
        stableId: "trend_anthropic",
        title: "Claude API update",
        canonicalUrl: "https://example.com/release",
        sourceName: "Anthropic News",
        publishedAt: "2026-08-02T20:00:00.000Z",
        domain: "ai",
        sourceTags: ["anthropic", "claude"],
        summary: "A verified API update.",
        whyItMatters: "Agent workflows become more reliable.",
        practicalImpact: "Review the migration notes.",
        trendCategory: "coding_agent",
        confirmationStatus: "official_only",
        confidence: 0.93,
        importanceScore: 91
      }
    ]
  };
}
