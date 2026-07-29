import { describe, expect, it } from "vitest";

import type { Digest, SourceEvidence, TrendItem } from "../src/domain/types.js";

describe("project initialization", () => {
  it("defines the initial Task 001 domain types", () => {
    const trendItem: TrendItem = {
      id: "trend_example",
      canonicalUrl: "https://example.com/news",
      canonicalHash: "hash",
      title: "Example",
      sourceName: "Example Source",
      publishedAt: null
    };
    const digest: Digest = {
      id: "digest_2026-07-29",
      reportDate: "2026-07-29",
      timezone: "Asia/Seoul",
      generatedAt: "2026-07-29T00:00:00.000Z"
    };
    const evidence: SourceEvidence = {
      id: "evidence_example",
      trendItemId: trendItem.id,
      sourceUrl: trendItem.canonicalUrl,
      sourceName: trendItem.sourceName,
      fetchedAt: digest.generatedAt,
      evidenceExcerpt: null,
      confidenceScore: 0.8
    };

    expect(evidence.trendItemId).toBe(trendItem.id);
    expect(digest.timezone).toBe("Asia/Seoul");
  });
});
