import { describe, expect, it } from "vitest";

import { normalizeSocialSignalSources } from "../src/social/social-source-config.js";

describe("social source config", () => {
  it("normalizes disabled social sources", () => {
    const sources = normalizeSocialSignalSources([source()]);

    expect(sources[0]).toMatchObject({
      id: "manual-public-ai-links",
      platform: "manual",
      enabled: false,
      defaultConfirmationStatus: "needs_confirmation",
      policyReviewedAt: "2026-08-02"
    });
  });

  it("keeps X and Threads disabled until policy and token scope are reviewed", () => {
    expect(() =>
      normalizeSocialSignalSources([
        {
          ...source(),
          id: "x-karpathy",
          platform: "x",
          collectionMethod: "api",
          enabled: true,
          security: { requiresToken: true, secretEnvName: "X_API_BEARER_TOKEN" }
        }
      ])
    ).toThrow(/must stay disabled/u);
  });

  it("requires secret env names for token-based sources", () => {
    expect(() =>
      normalizeSocialSignalSources([
        {
          ...source(),
          security: { requiresToken: true }
        }
      ])
    ).toThrow(/secretEnvName/u);
  });
});

function source() {
  return {
    id: "manual-public-ai-links",
    platform: "manual",
    displayName: "Manual public AI signal links",
    credibility: "trusted_individual",
    collectionMethod: "manual_export",
    enabled: false,
    defaultConfirmationStatus: "needs_confirmation",
    handles: [],
    accountIds: [],
    subreddits: [],
    keywords: ["ai"],
    officialDomainsToConfirm: ["openai.com"],
    rateLimit: { maxRequestsPerWindow: 1, windowSeconds: 60 },
    livePolling: {
      pollingIntervalMinutes: 60,
      cacheTtlMinutes: 30,
      timeoutMs: 5000,
      maxItemsPerFetch: 10,
      retryCount: 0,
      backoffMs: 0
    },
    security: { requiresToken: false },
    policyReviewedAt: "2026-08-02",
    policyNotes: "public links only"
  };
}
