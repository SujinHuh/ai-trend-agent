import { describe, expect, it } from "vitest";

import { calculateImportanceScore, compareDigestCandidates } from "../src/synthesis/rank-trend-items.js";
import { actionLevelFromScore, applyTrustGate } from "../src/synthesis/trust-gate.js";

describe("trend ranking", () => {
  it("uses deterministic tie-breaks", () => {
    const sorted = [
      {
        importanceScore: 70,
        confidence: 0.8,
        publishedAt: "2026-07-31T16:00:00.000Z",
        trendItemId: "trend_b"
      },
      {
        importanceScore: 70,
        confidence: 0.8,
        publishedAt: "2026-07-31T16:00:00.000Z",
        trendItemId: "trend_a"
      },
      {
        importanceScore: 90,
        confidence: 0.7,
        publishedAt: "2026-07-31T15:00:00.000Z",
        trendItemId: "trend_c"
      }
    ].sort(compareDigestCandidates);

    expect(sorted.map((item) => item.trendItemId)).toEqual(["trend_c", "trend_a", "trend_b"]);
  });

  it("prevents needs_confirmation from becoming do_now", () => {
    expect(
      applyTrustGate({
        desiredActionLevel: "do_now",
        confirmationStatus: "needs_confirmation",
        importanceScore: 95
      })
    ).toBe("needs_confirmation");
    expect(actionLevelFromScore({ importanceScore: 85, confirmationStatus: "official_only" })).toBe("do_now");
  });

  it("uses social velocity only as a small importance boost", () => {
    const base = calculateImportanceScore({
      trendItem: {
        id: "trend_one",
        canonicalUrl: "https://openai.com/news/agent",
        canonicalHash: "hash",
        title: "OpenAI agent model release",
        sourceName: "OpenAI News",
        publishedAt: "2026-08-01T16:00:00.000Z"
      },
      evidence: [
        {
          id: "evidence_one",
          trendItemId: "trend_one",
          sourceUrl: "https://openai.com/news/agent",
          sourceName: "OpenAI News",
          fetchedAt: "2026-08-01T16:00:00.000Z",
          evidenceExcerpt: "Official release.",
          confidenceScore: 0.95
        }
      ],
      reportDate: "2026-08-02",
      trendCategory: "coding_agent",
      confirmationStatus: "official_only",
      metadataByName: officialMetadata(),
      socialSignalCount: 0
    });
    const boosted = calculateImportanceScore({
      trendItem: {
        id: "trend_one",
        canonicalUrl: "https://openai.com/news/agent",
        canonicalHash: "hash",
        title: "OpenAI agent model release",
        sourceName: "OpenAI News",
        publishedAt: "2026-08-01T16:00:00.000Z"
      },
      evidence: [
        {
          id: "evidence_one",
          trendItemId: "trend_one",
          sourceUrl: "https://openai.com/news/agent",
          sourceName: "OpenAI News",
          fetchedAt: "2026-08-01T16:00:00.000Z",
          evidenceExcerpt: "Official release.",
          confidenceScore: 0.95
        }
      ],
      reportDate: "2026-08-02",
      trendCategory: "coding_agent",
      confirmationStatus: "official_only",
      metadataByName: officialMetadata(),
      socialSignalCount: 10
    });

    expect(boosted - base).toBe(6);
  });
});

function officialMetadata() {
  return new Map([["OpenAI News", { name: "OpenAI News", credibility: "official" as const, priority: 1, tags: [] }]]);
}
