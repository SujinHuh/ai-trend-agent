import { describe, expect, it } from "vitest";

import { createLlmWikiStore, type LlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import type { NormalizedSourceConfig } from "../src/sources/source-config.js";
import type { DigestIntelligenceProvider } from "../src/llm/digest-intelligence.js";
import {
  buildDigestIntelligencePrompt,
  enrichDigestCandidatesWithLlm,
  estimateLlmCostUsd,
  parseDigestIntelligenceResponse,
  redactSecrets
} from "../src/llm/digest-intelligence.js";
import { buildSlackDigestAsync } from "../src/slack/send-slack-digest.js";
import { selectDigestCandidates } from "../src/synthesis/select-digest-candidates.js";

describe("digest intelligence", () => {
  it("redacts secrets before prompt text can reach a provider", () => {
    const value = [
      "https://hooks.slack.com/services/T000/B000/secret",
      "CRON_SECRET",
      "Bearer live-token-123",
      "api_key=abc123",
      "token=tok123",
      "code=auth-code"
    ].join(" ");

    const redacted = redactSecrets(value);

    expect(redacted).not.toContain("hooks.slack.com/services/T000");
    expect(redacted).not.toContain("CRON_SECRET");
    expect(redacted).not.toContain("live-token-123");
    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("tok123");
    expect(redacted).not.toContain("auth-code");
  });

  it("builds prompt input from selected candidates only", () => {
    const { db, store } = openInitializedStore();
    seedCandidates(store, 12);

    const candidates = selectDigestCandidates(storeInput(store, 12));
    const request = buildDigestIntelligencePrompt({
      reportDate: "2026-08-03",
      candidates,
      limit: 20
    });

    expect(request.candidates).toHaveLength(10);
    expect(request.candidates[0]?.title).toBe("Model signal 11");
    expect(request.prompt).toContain("digest_intelligence");
    db.close();
  });

  it("parses structured JSON and rejects unknown candidate IDs", () => {
    const parsed = parseDigestIntelligenceResponse({
      rawText: JSON.stringify({
        items: [
          {
            trendItemId: "trend_one",
            summary: "Better summary",
            importanceScore: 130,
            actionLevel: "do_now",
            urgency: "high",
            confirmationStatus: "confirmed"
          }
        ]
      }),
      allowedTrendItemIds: ["trend_one"]
    });

    expect(parsed).toEqual([
      {
        trendItemId: "trend_one",
        summary: "Better summary",
        importanceScore: 100,
        actionLevel: "do_now",
        urgency: "high"
      }
    ]);
    expect(() =>
      parseDigestIntelligenceResponse({
        rawText: JSON.stringify({ items: [{ trendItemId: "unknown" }] }),
        allowedTrendItemIds: ["trend_one"]
      })
    ).toThrow(/unknown trendItemId/);
    expect(() =>
      parseDigestIntelligenceResponse({
        rawText: JSON.stringify({ items: [{ trendItemId: "trend_one", actionLevel: "ship_it" }] }),
        allowedTrendItemIds: ["trend_one"]
      })
    ).toThrow(/invalid actionLevel/);
  });

  it("logs token usage and preserves deterministic confirmation policy", async () => {
    const { db, store } = openInitializedStore();
    const candidate = seedCandidates(store, 1)[0];
    if (candidate === undefined) {
      throw new Error("Expected seeded candidate");
    }
    const provider = fakeProvider({
      items: [
        {
          trendItemId: candidate.trendItemId,
          summary: "LLM summary",
          whyItMatters: "LLM why",
          practicalImpact: "LLM impact",
          importanceScore: 99,
          actionLevel: "do_now",
          confirmationStatus: "confirmed"
        }
      ]
    });

    const result = await enrichDigestCandidatesWithLlm({
      store,
      reportDate: "2026-08-03",
      provider,
      enabled: true,
      limit: 5,
      pricePerMillionInputTokensUsd: 1,
      pricePerMillionOutputTokensUsd: 2,
      now: () => "2026-08-03T00:00:00.000Z"
    });
    const enriched = selectDigestCandidates(storeInput(store, 5))[0];

    expect(result.enrichedCount).toBe(1);
    expect(result.usageLog).toMatchObject({
      reportDate: "2026-08-03",
      providerName: "fake",
      modelName: "fake-digest",
      candidateCount: 1,
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      estimatedCostUsd: 0.00018,
      status: "success"
    });
    expect(store.listLlmUsageLogs("2026-08-03")).toHaveLength(1);
    expect(enriched?.assessment.summary).toBe("LLM summary");
    expect(enriched?.assessment.confirmationStatus).toBe("official_only");
    expect(enriched?.assessment.actionLevel).toBe("do_now");
    db.close();
  });

  it("falls back without provider calls when disabled", async () => {
    const { db, store } = openInitializedStore();
    seedCandidates(store, 1);
    let called = false;

    const result = await enrichDigestCandidatesWithLlm({
      store,
      reportDate: "2026-08-03",
      provider: fakeProvider({ items: [] }, () => {
        called = true;
      }),
      enabled: false,
      limit: 5
    });

    expect(called).toBe(false);
    expect(result).toMatchObject({
      enabled: false,
      candidateCount: 1,
      enrichedCount: 0,
      fallbackReason: "llm_disabled",
      usageLog: null
    });
    expect(store.listLlmUsageLogs("2026-08-03")).toEqual([]);
    db.close();
  });

  it("records actual token usage when provider output is invalid after a model call", async () => {
    const { db, store } = openInitializedStore();
    seedCandidates(store, 1);

    const result = await enrichDigestCandidatesWithLlm({
      store,
      reportDate: "2026-08-03",
      provider: {
        providerName: "fake",
        modelName: "bad-json",
        async generateDigestIntelligence() {
          return { rawText: "not json", usage: { inputTokens: 10, outputTokens: 2 } };
        }
      },
      enabled: true,
      limit: 5,
      now: () => "2026-08-03T00:01:00.000Z"
    });

    expect(result.fallbackReason).toContain("malformed JSON");
    expect(store.listLlmUsageLogs("2026-08-03")).toMatchObject([
      {
        providerName: "fake",
        modelName: "bad-json",
        inputTokens: 10,
        outputTokens: 2,
        estimatedCostUsd: 0,
        status: "fallback"
      }
    ]);
    db.close();
  });

  it("uses existing daily usage logs before enforcing the daily cost cap", async () => {
    const { db, store } = openInitializedStore();
    seedCandidates(store, 1);
    store.saveLlmUsageLog({
      reportDate: "2026-08-03",
      purpose: "digest_intelligence",
      providerName: "fake",
      modelName: "fake-digest",
      candidateCount: 1,
      inputTokens: 100,
      outputTokens: 100,
      estimatedCostUsd: 0.5,
      status: "success",
      createdAt: "2026-08-03T00:00:00.000Z"
    });
    let called = false;

    const result = await enrichDigestCandidatesWithLlm({
      store,
      reportDate: "2026-08-03",
      provider: fakeProvider({ items: [] }, () => {
        called = true;
      }),
      enabled: true,
      limit: 5,
      maxDailyCostUsd: 0.5,
      now: () => "2026-08-03T00:00:00.000Z"
    });

    expect(called).toBe(false);
    expect(result.fallbackReason).toBe("daily_cost_cap_already_exceeded");
    expect(store.listLlmUsageLogs("2026-08-03")).toHaveLength(2);
    db.close();
  });

  it("avoids usage log ID collisions for repeated fixed timestamps", () => {
    const { db, store } = openInitializedStore();

    const first = store.saveLlmUsageLog({
      reportDate: "2026-08-03",
      purpose: "digest_intelligence",
      providerName: "fake",
      modelName: "fake-digest",
      candidateCount: 1,
      inputTokens: 1,
      outputTokens: 1,
      estimatedCostUsd: 0,
      status: "success",
      createdAt: "2026-08-03T00:00:00.000Z"
    });
    const second = store.saveLlmUsageLog({
      reportDate: "2026-08-03",
      purpose: "digest_intelligence",
      providerName: "fake",
      modelName: "fake-digest",
      candidateCount: 1,
      inputTokens: 1,
      outputTokens: 1,
      estimatedCostUsd: 0,
      status: "fallback",
      createdAt: "2026-08-03T00:00:00.000Z"
    });

    expect(second.id).not.toBe(first.id);
    expect(store.listLlmUsageLogs("2026-08-03")).toHaveLength(2);
    db.close();
  });

  it("hands enriched fields to Slack rendering through the digest builder", async () => {
    const { db, store } = openInitializedStore();
    const candidate = seedCandidates(store, 1)[0];
    if (candidate === undefined) {
      throw new Error("Expected seeded candidate");
    }

    const built = await buildSlackDigestAsync({
      store,
      reportDate: "2026-08-03",
      sources: [exampleSource()],
      limit: 5,
      enableLlmDigestIntelligence: true,
      llmDigestProvider: fakeProvider({
        items: [
          {
            trendItemId: candidate.trendItemId,
            summary: "LLM Slack summary",
            whyItMatters: "LLM Slack why",
            practicalImpact: "LLM Slack impact",
            importanceScore: 88,
            actionLevel: "do_now"
          }
        ]
      })
    });
    const rendered = JSON.stringify(built.payload);

    expect(rendered).toContain("LLM Slack summary");
    expect(rendered).toContain("LLM Slack why");
    expect(rendered).toContain("LLM Slack impact");
    db.close();
  });

  it("estimates token cost from input and output pricing", () => {
    expect(
      estimateLlmCostUsd({
        usage: { inputTokens: 1_000, outputTokens: 500 },
        pricePerMillionInputTokensUsd: 1,
        pricePerMillionOutputTokensUsd: 2
      })
    ).toBe(0.002);
  });
});

function openInitializedStore() {
  const db = openSqliteDatabase(":memory:");
  const store = createLlmWikiStore(db);
  store.initialize();

  return { db, store };
}

function storeInput(store: LlmWikiStore, limit: number) {
  return {
    store,
    reportDate: "2026-08-03",
    limit
  };
}

function seedCandidates(
  store: LlmWikiStore,
  count: number,
  options: { confirmationStatus?: "official_only" | "needs_confirmation" } = {}
): Array<{ trendItemId: string }> {
  return Array.from({ length: count }, (_, index) => {
    const trendItem = store.saveTrendItem({
      sourceUrl: `https://example.com/item-${index}`,
      title: `Model signal ${index}`,
      sourceName: "Example Source",
      publishedAt: "2026-08-02T16:00:00.000Z"
    });
    const evidence = store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: `https://example.com/source-${index}`,
      sourceName: "Example Source",
      fetchedAt: "2026-08-03T00:00:00.000Z",
      evidenceExcerpt: `Evidence ${index}`,
      confidenceScore: 0.9
    });
    store.saveTrendAssessment({
      trendItemId: trendItem.id,
      reportDate: "2026-08-03",
      summary: `Summary ${index}`,
      whyItMatters: `Why ${index}`,
      practicalImpact: `Impact ${index}`,
      trendCategory: "model",
      actionLevel: index >= 8 ? "do_now" : "do_next",
      confirmationStatus: options.confirmationStatus ?? "official_only",
      confidence: 0.9,
      importanceScore: 70 + index,
      stalenessPolicy: "Recheck later",
      sourceEvidenceIds: [evidence.id]
    });

    return { trendItemId: trendItem.id };
  });
}

function exampleSource(): NormalizedSourceConfig {
  return {
    id: "example-source",
    name: "Example Source",
    type: "rss",
    url: "https://example.com/feed.xml",
    category: "llm_vendor",
    credibility: "official",
    enabled: true,
    priority: 10,
    tags: ["ai"],
    fetchConfig: {
      timeoutMs: 5000,
      maxItemsPerFetch: 10,
      cacheTtlMinutes: 60
    },
    official: true,
    parserType: "rss_parser",
    timezone: "UTC",
    rateLimit: {
      requestsPerMinute: 12
    },
    retry: {
      maxAttempts: 2,
      backoffMs: 1000
    },
    canonicalizationRules: {
      removeQueryParams: ["utm_*"],
      stripFragment: true,
      stripTrailingSlash: true,
      forceHttps: true
    }
  };
}

function fakeProvider(body: unknown, onCall?: () => void): DigestIntelligenceProvider {
  return {
    providerName: "fake",
    modelName: "fake-digest",
    async generateDigestIntelligence() {
      onCall?.();
      return {
        rawText: JSON.stringify(body),
        usage: {
          inputTokens: 100,
          outputTokens: 40
        }
      };
    }
  };
}
