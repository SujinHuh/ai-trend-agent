import { describe, expect, it } from "vitest";

import type {
  DigestCandidate,
  PersonalizationFeedback,
  UserInterestProfile
} from "../src/domain/types.js";
import { personalizeDigestCandidates } from "../src/personalization/personalize-digest-candidates.js";
import { getFeedbackCutoff } from "../src/synthesis/select-digest-candidates.js";
import type { SourceMetadataByName } from "../src/synthesis/source-lineage.js";

const metadataByName: SourceMetadataByName = new Map([
  ["AI Source", { name: "AI Source", domain: "ai", credibility: "official", priority: 5, tags: ["models"] }],
  ["Business Source", { name: "Business Source", domain: "ai", credibility: "official", priority: 5, tags: ["business"] }],
  ["Backend Source", { name: "Backend Source", domain: "backend", credibility: "official", priority: 5, tags: ["runtime"] }]
]);

describe("personalizeDigestCandidates", () => {
  it("uses the profile delivery time as the immutable report feedback cutoff", () => {
    expect(getFeedbackCutoff("2026-08-03", "07:00")).toBe("2026-08-02T22:00:00.000Z");
    expect(getFeedbackCutoff("2026-08-03", "18:30")).toBe("2026-08-03T09:30:00.000Z");
    expect(() => getFeedbackCutoff("2026-08-03", "25:00")).toThrow(/delivery time/);
  });
  it("promotes a base top-N outsider using bounded interest tags without mutating importance", () => {
    const candidates = [
      candidate("business", 92, "business", "Business Source"),
      candidate("model-a", 85, "model", "AI Source"),
      candidate("model-b", 78, "model", "AI Source")
    ];
    const profile = profileWith({ highPriorityTags: ["models"] });

    const results = personalizeDigestCandidates({
      candidates,
      profile,
      feedback: [],
      metadataByName,
      limit: 1
    });

    expect(results.map((result) => result.candidate.trendItem.id)).toEqual(["model-a"]);
    expect(results[0]?.personalizationBoost).toBe(10);
    expect(candidates[1]?.assessment.importanceScore).toBe(85);
  });

  it("uses only the latest item action and keeps save-later weaker than interested", () => {
    const candidates = [
      candidate("first", 80, "model", "AI Source"),
      candidate("second", 80, "model", "AI Source")
    ];
    const feedback = [
      event("old-hide", "first", "hide", "2026-08-03T10:00:00.000Z"),
      event("new-interest", "first", "interested", "2026-08-03T11:00:00.000Z"),
      event("save", "second", "save_later", "2026-08-03T11:00:00.000Z")
    ];

    const results = personalizeDigestCandidates({
      candidates,
      profile: profileWith({}),
      feedback,
      metadataByName,
      limit: 5
    });

    expect(results.map((result) => result.candidate.trendItem.id)).toEqual(["first", "second"]);
    expect(results[0]?.personalizationBoost).toBeGreaterThan(results[1]?.personalizationBoost ?? 0);
  });

  it("hard-excludes hidden items, muted tags, blocked keywords, and disabled profile domains", () => {
    const candidates = [
      candidate("hidden", 99, "model", "AI Source"),
      candidate("muted", 98, "business", "AI Source"),
      candidate("blocked", 97, "model", "AI Source", "Crypto model release"),
      candidate("backend", 96, "infra", "Backend Source"),
      candidate("visible", 70, "model", "AI Source")
    ];
    const results = personalizeDigestCandidates({
      candidates,
      profile: profileWith({ mutedTags: ["business"], blockedKeywords: ["crypto"], enabledDomains: ["ai"] }),
      feedback: [event("hide", "hidden", "hide", "2026-08-03T11:00:00.000Z")],
      metadataByName,
      limit: 5
    });

    expect(results.map((result) => result.candidate.trendItem.id)).toEqual(["visible"]);
  });

  it("uses deterministic base tie-breaks when personalized scores match", () => {
    const results = personalizeDigestCandidates({
      candidates: [candidate("b", 80, "model", "AI Source"), candidate("a", 80, "model", "AI Source")],
      profile: profileWith({}),
      feedback: [],
      metadataByName,
      limit: 5
    });
    expect(results.map((result) => result.candidate.trendItem.id)).toEqual(["a", "b"]);
  });
});

function candidate(
  id: string,
  importanceScore: number,
  trendCategory: DigestCandidate["assessment"]["trendCategory"],
  sourceName: string,
  title = id
): DigestCandidate {
  return {
    trendItem: {
      id,
      canonicalUrl: `https://example.com/${id}`,
      canonicalHash: `hash-${id}`,
      title,
      sourceName,
      publishedAt: "2026-08-03T00:00:00.000Z"
    },
    assessment: {
      id: `assessment-${id}`,
      trendItemId: id,
      reportDate: "2026-08-03",
      summary: title,
      whyItMatters: "why",
      practicalImpact: "impact",
      trendCategory,
      actionLevel: "do_next",
      confirmationStatus: "official_only",
      confidence: 0.9,
      importanceScore,
      contradictionNotes: null,
      stalenessPolicy: "recheck",
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z"
    },
    lineage: [{
      assessmentId: `assessment-${id}`,
      sourceEvidenceId: `evidence-${id}`,
      sourceName,
      sourceUrl: `https://example.com/${id}`,
      confidenceScore: 0.9
    }]
  };
}

function profileWith(overrides: Partial<UserInterestProfile>): UserInterestProfile {
  return {
    id: "U123",
    highPriorityTags: [],
    normalPriorityTags: [],
    mutedTags: [],
    enabledDomains: ["ai", "backend"],
    blockedKeywords: [],
    preferredDeliveryTime: "07:00",
    timezone: "Asia/Seoul",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides
  };
}

function event(
  id: string,
  trendItemId: string,
  action: PersonalizationFeedback["action"],
  occurredAt: string
): PersonalizationFeedback {
  return {
    id,
    eventKey: id,
    userProfileId: "U123",
    trendItemId,
    action,
    occurredAt,
    createdAt: occurredAt
  };
}
