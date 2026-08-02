import { describe, expect, it } from "vitest";

import type { SourceEvidence, TrendItem } from "../src/domain/types.js";
import { createTrendSynthesis } from "../src/synthesis/create-trend-synthesis.js";
import type { SourceMetadataByName } from "../src/synthesis/source-lineage.js";

describe("createTrendSynthesis", () => {
  it("creates deterministic official synthesis with action fields", () => {
    const trendItem = item({
      title: "Claude model API release",
      publishedAt: "2026-07-31T16:00:00.000Z"
    });
    const evidence = sourceEvidence({
      trendItemId: trendItem.id,
      evidenceExcerpt: "Anthropic released a model API update for coding agents."
    });

    const synthesis = createTrendSynthesis({
      item: { trendItem, evidence: [evidence] },
      reportDate: "2026-08-01",
      metadataByName: officialMetadata()
    });

    expect(synthesis).toMatchObject({
      trendItemId: trendItem.id,
      reportDate: "2026-08-01",
      summary: "Anthropic released a model API update for coding agents.",
      trendCategory: "coding_agent",
      confirmationStatus: "official_only",
      confidence: 0.85,
      sourceEvidenceIds: [evidence.id]
    });
    expect(synthesis.importanceScore).toBeGreaterThanOrEqual(80);
    expect(synthesis.actionLevel).toBe("do_now");
  });

  it("keeps unconfirmed signals behind the trust gate", () => {
    const trendItem = item({
      title: "Rumored model launch",
      publishedAt: "2026-07-31T16:00:00.000Z"
    });
    const evidence = sourceEvidence({
      trendItemId: trendItem.id,
      sourceName: "Community Forum",
      evidenceExcerpt: "Community rumor about a model launch."
    });

    const synthesis = createTrendSynthesis({
      item: { trendItem, evidence: [evidence] },
      reportDate: "2026-08-01",
      metadataByName: new Map([
        [
          "Community Forum",
          {
            name: "Community Forum",
            credibility: "community",
            priority: 5,
            tags: ["ai"]
          }
        ]
      ])
    });

    expect(synthesis.confirmationStatus).toBe("needs_confirmation");
    expect(synthesis.actionLevel).toBe("needs_confirmation");
    expect(synthesis.confidence).toBeLessThanOrEqual(0.6);
  });
});

function item(input: { title: string; publishedAt: string | null }): TrendItem {
  return {
    id: `trend_${input.title.toLowerCase().replaceAll(" ", "_")}`,
    canonicalUrl: `https://example.com/${input.title.toLowerCase().replaceAll(" ", "-")}`,
    canonicalHash: "hash",
    title: input.title,
    sourceName: "Anthropic News",
    publishedAt: input.publishedAt
  };
}

function sourceEvidence(input: {
  trendItemId: string;
  sourceName?: string;
  evidenceExcerpt: string;
}): SourceEvidence {
  const sourceName = input.sourceName ?? "Anthropic News";

  return {
    id: `evidence_${input.trendItemId}`,
    trendItemId: input.trendItemId,
    sourceUrl: "https://example.com/source",
    sourceName,
    fetchedAt: "2026-08-01T00:00:00.000Z",
    evidenceExcerpt: input.evidenceExcerpt,
    confidenceScore: 0.85
  };
}

function officialMetadata(): SourceMetadataByName {
  return new Map([
    [
      "Anthropic News",
      {
        name: "Anthropic News",
        credibility: "official",
        priority: 5,
        tags: ["ai"]
      }
    ]
  ]);
}
