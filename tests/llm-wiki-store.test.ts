import { describe, expect, it } from "vitest";

import { createLlmWikiStore } from "../src/db/llm-wiki-store.js";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { createTrendIdentity } from "../src/identity/stable-id.js";

function openInitializedStore() {
  const db = openSqliteDatabase(":memory:");
  const store = createLlmWikiStore(db);
  store.initialize();

  return { db, store };
}

describe("LlmWikiStore", () => {
  it("stores normalized user profiles and preserves defaults on partial updates", () => {
    const { db, store } = openInitializedStore();
    const created = store.saveUserInterestProfile({
      id: " U123 ",
      highPriorityTags: ["Models", "models", " Coding-Agent "],
      mutedTags: ["Business"],
      enabledDomains: ["backend", "ai"],
      preferredDeliveryTime: "08:30",
      updatedAt: "2026-08-03T15:20:00.000Z"
    });

    expect(created).toMatchObject({
      id: "U123",
      highPriorityTags: ["coding-agent", "models"],
      normalPriorityTags: [],
      mutedTags: ["business"],
      enabledDomains: ["ai", "backend"],
      blockedKeywords: [],
      preferredDeliveryTime: "08:30",
      timezone: "Asia/Seoul"
    });

    const updated = store.saveUserInterestProfile({
      id: "U123",
      blockedKeywords: [" Crypto ", "crypto"],
      updatedAt: "2026-08-03T15:21:00.000Z"
    });
    expect(updated.highPriorityTags).toEqual(["coding-agent", "models"]);
    expect(updated.blockedKeywords).toEqual(["crypto"]);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe("2026-08-03T15:21:00.000Z");

    expect(() => store.saveUserInterestProfile({ id: "bad-time", preferredDeliveryTime: "25:00" })).toThrow(
      /HH:MM/
    );
    expect(() =>
      store.saveUserInterestProfile({ id: "bad-domain", enabledDomains: ["mobile" as "ai"] })
    ).toThrow(/enabledDomains/);
    db.close();
  });

  it("stores append-only feedback idempotently and exposes newest actions first", () => {
    const { db, store } = openInitializedStore();
    store.saveUserInterestProfile({ id: "U123", updatedAt: "2026-08-03T15:20:00.000Z" });
    const item = store.saveTrendItem({
      sourceUrl: "https://example.com/personalized",
      title: "Personalized item",
      sourceName: "Example",
      publishedAt: "2026-08-03T00:00:00.000Z"
    });
    const interested = store.savePersonalizationFeedback({
      eventKey: "slack-event-1",
      userProfileId: "U123",
      trendItemId: item.id,
      action: "interested",
      occurredAt: "2026-08-03T15:20:00.000Z"
    });
    const retried = store.savePersonalizationFeedback({
      eventKey: "slack-event-1",
      userProfileId: "U123",
      trendItemId: item.id,
      action: "interested",
      occurredAt: "2026-08-03T15:20:00.000Z"
    });
    const hidden = store.savePersonalizationFeedback({
      eventKey: "slack-event-2",
      userProfileId: "U123",
      trendItemId: item.id,
      action: "hide",
      occurredAt: "2026-08-03T15:21:00.000Z"
    });

    expect(retried).toEqual(interested);
    expect(db.prepare("SELECT COUNT(*) FROM personalization_feedback").pluck().get()).toBe(2);
    expect(store.listPersonalizationFeedback("U123")).toEqual([hidden, interested]);
    expect(() =>
      store.savePersonalizationFeedback({
        eventKey: "slack-event-1",
        userProfileId: "U123",
        trendItemId: item.id,
        action: "hide",
        occurredAt: "2026-08-03T15:20:00.000Z"
      })
    ).toThrow(/different content/);
    expect(() =>
      store.savePersonalizationFeedback({
        eventKey: "missing-profile",
        userProfileId: "missing",
        trendItemId: item.id,
        action: "interested",
        occurredAt: "2026-08-03T15:22:00.000Z"
      })
    ).toThrow(/Unknown user profile/);
    db.close();
  });

  it("normalizes feedback timestamps and applies deterministic cutoffs", () => {
    const { db, store } = openInitializedStore();
    store.saveUserInterestProfile({ id: "U123", updatedAt: "2026-08-03T00:00:00.000Z" });
    const item = store.saveTrendItem({
      sourceUrl: "https://example.com/timezones",
      title: "Timezone feedback",
      sourceName: "Example",
      publishedAt: null
    });
    const first = store.savePersonalizationFeedback({
      eventKey: "timezone-1",
      userProfileId: "U123",
      trendItemId: item.id,
      action: "interested",
      occurredAt: "2026-08-03T20:00:00+09:00"
    });
    const second = store.savePersonalizationFeedback({
      eventKey: "timezone-2",
      userProfileId: "U123",
      trendItemId: item.id,
      action: "hide",
      occurredAt: "2026-08-03T12:00:00Z"
    });

    expect(first.occurredAt).toBe("2026-08-03T11:00:00.000Z");
    expect(store.listPersonalizationFeedback("U123")).toEqual([second, first]);
    expect(store.listPersonalizationFeedback("U123", "2026-08-03T11:30:00Z")).toEqual([first]);
    expect(store.savePersonalizationFeedback({
      eventKey: "timezone-1",
      userProfileId: "U123",
      trendItemId: item.id,
      action: "interested",
      occurredAt: "2026-08-03T13:00:00Z"
    })).toEqual(first);
    db.close();
  });
  it("saves and reads a TrendItem using canonical URL identity", () => {
    const { db, store } = openInitializedStore();

    const trendItem = store.saveTrendItem({
      sourceUrl: "http://OpenAI.com/news/example/?utm_source=slack#top",
      title: "Example",
      sourceName: "OpenAI News",
      publishedAt: null
    });
    const identity = createTrendIdentity("https://openai.com/news/example");

    expect(trendItem).toEqual({
      id: identity.id,
      canonicalUrl: identity.canonicalUrl,
      canonicalHash: identity.canonicalHash,
      title: "Example",
      sourceName: "OpenAI News",
      publishedAt: null
    });

    expect(store.getTrendItem(trendItem.id)).toEqual(trendItem);
    db.close();
  });

  it("prevents duplicate TrendItems across tracking URL variants", () => {
    const { db, store } = openInitializedStore();

    const first = store.saveTrendItem({
      sourceUrl: "https://example.com/news?id=42&utm_campaign=launch",
      title: "Initial Title",
      sourceName: "Example Source",
      publishedAt: null
    });

    const second = store.saveTrendItem({
      sourceUrl: "http://EXAMPLE.com/news/?id=42&source=feed#section",
      title: "Updated Title",
      sourceName: "Example Source",
      publishedAt: "2026-07-29T00:00:00.000Z"
    });

    const count = db.prepare("SELECT COUNT(*) FROM trend_items").pluck().get();

    expect(count).toBe(1);
    expect(second.id).toBe(first.id);
    expect(second.title).toBe("Updated Title");
    expect(second.publishedAt).toBe("2026-07-29T00:00:00.000Z");
    db.close();
  });

  it("saves a Digest with linked TrendItems and SourceEvidence", () => {
    const { db, store } = openInitializedStore();

    const trendItem = store.saveTrendItem({
      sourceUrl: "https://openai.com/news/example",
      title: "Example",
      sourceName: "OpenAI News",
      publishedAt: "2026-07-29T00:00:00.000Z"
    });
    const digest = store.saveDigest({
      reportDate: "2026-07-29",
      generatedAt: "2026-07-28T22:00:00.000Z",
      trendItemIds: [trendItem.id]
    });

    const evidence = store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: "https://openai.com/news/example",
      sourceName: "OpenAI News",
      fetchedAt: "2026-07-28T21:55:00.000Z",
      evidenceExcerpt: "Example excerpt",
      confidenceScore: 0.8
    });

    expect(store.getDigestByReportDate("2026-07-29")).toEqual({
      digest,
      items: [trendItem],
      evidence: [evidence]
    });
    expect(store.getDigestByReportDate("2026-07-30")).toBeNull();
    db.close();
  });

  it("replaces Digest membership for the same report date", () => {
    const { db, store } = openInitializedStore();

    const first = store.saveTrendItem({
      sourceUrl: "https://example.com/first",
      title: "First",
      sourceName: "Example Source",
      publishedAt: null
    });
    const second = store.saveTrendItem({
      sourceUrl: "https://example.com/second",
      title: "Second",
      sourceName: "Example Source",
      publishedAt: null
    });

    store.saveDigest({
      reportDate: "2026-07-29",
      generatedAt: "2026-07-28T22:00:00.000Z",
      trendItemIds: [first.id]
    });
    const updated = store.saveDigest({
      reportDate: "2026-07-29",
      generatedAt: "2026-07-28T23:00:00.000Z",
      trendItemIds: [second.id]
    });

    expect(store.getDigestByReportDate("2026-07-29")).toMatchObject({
      digest: updated,
      items: [second],
      evidence: []
    });
    db.close();
  });

  it("keeps SourceEvidence rows distinct by source name", () => {
    const { db, store } = openInitializedStore();

    const trendItem = store.saveTrendItem({
      sourceUrl: "https://example.com/news",
      title: "Example",
      sourceName: "Example Source",
      publishedAt: null
    });
    const first = store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: "https://example.com/news?utm_source=feed",
      sourceName: "Official Blog",
      fetchedAt: "2026-07-28T21:55:00.000Z",
      evidenceExcerpt: "Official excerpt",
      confidenceScore: 0.9
    });
    const second = store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: "https://example.com/news",
      sourceName: "Mirror Feed",
      fetchedAt: "2026-07-28T21:55:00.000Z",
      evidenceExcerpt: "Mirror excerpt",
      confidenceScore: 0.7
    });

    expect(second.id).not.toBe(first.id);
    expect(db.prepare("SELECT COUNT(*) FROM source_evidence").pluck().get()).toBe(2);
    db.close();
  });

  it("saves trend assessments idempotently and preserves source lineage", () => {
    const { db, store } = openInitializedStore();

    const trendItem = store.saveTrendItem({
      sourceUrl: "https://example.com/model-release",
      title: "Example model release",
      sourceName: "Example Source",
      publishedAt: "2026-07-31T16:00:00.000Z"
    });
    const evidence = store.saveSourceEvidence({
      trendItemId: trendItem.id,
      sourceUrl: "https://example.com/model-release",
      sourceName: "Example Source",
      fetchedAt: "2026-08-01T00:00:00.000Z",
      evidenceExcerpt: "Example released a model API update.",
      confidenceScore: 0.85
    });

    const first = store.saveTrendAssessment({
      trendItemId: trendItem.id,
      reportDate: "2026-08-01",
      summary: "Initial summary",
      whyItMatters: "Initial why",
      practicalImpact: "Initial impact",
      trendCategory: "model",
      actionLevel: "do_next",
      confirmationStatus: "official_only",
      confidence: 0.85,
      importanceScore: 72,
      stalenessPolicy: "Recheck later",
      sourceEvidenceIds: [evidence.id]
    });
    const second = store.saveTrendAssessment({
      trendItemId: trendItem.id,
      reportDate: "2026-08-01",
      summary: "Updated summary",
      whyItMatters: "Updated why",
      practicalImpact: "Updated impact",
      trendCategory: "model",
      actionLevel: "do_now",
      confirmationStatus: "official_only",
      confidence: 0.9,
      importanceScore: 85,
      stalenessPolicy: "Recheck later",
      sourceEvidenceIds: [evidence.id]
    });

    expect(second.id).toBe(first.id);
    expect(second.summary).toBe("Updated summary");
    expect(db.prepare("SELECT COUNT(*) FROM trend_assessments").pluck().get()).toBe(1);
    expect(store.listDigestCandidates("2026-08-01", 5)).toMatchObject([
      {
        assessment: {
          id: first.id,
          importanceScore: 85
        },
        trendItem: {
          id: trendItem.id
        },
        lineage: [
          {
            sourceEvidenceId: evidence.id,
            sourceUrl: "https://example.com/model-release"
          }
        ]
      }
    ]);

    db.close();
  });

  it("fails when assessment lineage references missing SourceEvidence", () => {
    const { db, store } = openInitializedStore();

    const trendItem = store.saveTrendItem({
      sourceUrl: "https://example.com/missing-lineage",
      title: "Missing lineage",
      sourceName: "Example Source",
      publishedAt: "2026-07-31T16:00:00.000Z"
    });

    expect(() =>
      store.saveTrendAssessment({
        trendItemId: trendItem.id,
        reportDate: "2026-08-01",
        summary: "Summary",
        whyItMatters: "Why",
        practicalImpact: "Impact",
        trendCategory: "product",
        actionLevel: "watch_later",
        confirmationStatus: "official_only",
        confidence: 0.85,
        importanceScore: 50,
        stalenessPolicy: "Recheck later",
        sourceEvidenceIds: ["missing_evidence"]
      })
    ).toThrow(/Missing SourceEvidence/);

    db.close();
  });

  it("lists assessment inputs inside the KST report date window", () => {
    const { db, store } = openInitializedStore();

    const included = store.saveTrendItem({
      sourceUrl: "https://example.com/included",
      title: "Included",
      sourceName: "Example Source",
      publishedAt: "2026-07-31T16:00:00.000Z"
    });
    store.saveTrendItem({
      sourceUrl: "https://example.com/excluded",
      title: "Excluded",
      sourceName: "Example Source",
      publishedAt: "2026-07-31T14:59:59.000Z"
    });
    store.saveSourceEvidence({
      trendItemId: included.id,
      sourceUrl: "https://example.com/included",
      sourceName: "Example Source",
      fetchedAt: "2026-08-01T00:00:00.000Z",
      evidenceExcerpt: "Included evidence.",
      confidenceScore: 0.8
    });

    const inputs = store.listTrendAssessmentInputsForReportDate("2026-08-01");

    expect(inputs).toHaveLength(1);
    expect(inputs[0]?.trendItem.id).toBe(included.id);
    expect(inputs[0]?.evidence).toHaveLength(1);
    db.close();
  });

  it("saves and lists Slack delivery attempts without storing webhook URLs", () => {
    const { db, store } = openInitializedStore();

    const attempt = store.saveSlackDeliveryAttempt({
      reportDate: "2026-08-01",
      webhookHost: "hooks.slack.com",
      status: "success",
      httpStatusCode: 200,
      sentAt: "2026-08-01T00:00:00.000Z",
      payloadHash: "hash"
    });

    expect(attempt).toMatchObject({
      reportDate: "2026-08-01",
      webhookHost: "hooks.slack.com",
      status: "success",
      httpStatusCode: 200,
      errorMessage: null,
      payloadHash: "hash"
    });
    expect(store.listSlackDeliveryAttempts("2026-08-01")).toEqual([attempt]);
    expect(JSON.stringify(attempt)).not.toContain("https://hooks.slack.com");
    db.close();
  });

  it("finds only successful Slack delivery attempts by report date and payload hash", () => {
    const { db, store } = openInitializedStore();

    store.saveSlackDeliveryAttempt({
      reportDate: "2026-08-01",
      webhookHost: "hooks.slack.com",
      status: "failed",
      httpStatusCode: 500,
      errorMessage: "server error",
      sentAt: "2026-08-01T00:00:00.000Z",
      payloadHash: "same-payload"
    });
    const success = store.saveSlackDeliveryAttempt({
      reportDate: "2026-08-01",
      webhookHost: "hooks.slack.com",
      status: "success",
      httpStatusCode: 200,
      sentAt: "2026-08-01T00:01:00.000Z",
      payloadHash: "same-payload"
    });

    expect(store.findSuccessfulSlackDeliveryAttempt("2026-08-01", "same-payload")).toEqual(success);
    expect(store.findSuccessfulSlackDeliveryAttempt("2026-08-01", "different-payload")).toBeNull();
    expect(store.findSuccessfulSlackDeliveryAttempt("2026-08-02", "same-payload")).toBeNull();
    db.close();
  });

  it("stores cron runs and finds successful send runs by idempotency key", () => {
    const { db, store } = openInitializedStore();
    const failed = store.createCronRun({
      idempotencyKey: "hermes-cron:daily-digest:2026-08-01",
      reportDate: "2026-08-01",
      mode: "send",
      startedAt: "2026-08-01T00:00:00.000Z",
      stepName: "started"
    });
    store.markCronRunFailure(failed.id, {
      finishedAt: "2026-08-01T00:00:01.000Z",
      stepName: "failed",
      candidateCount: 0,
      errorMessage: "temporary"
    });
    const running = store.createCronRun({
      idempotencyKey: "hermes-cron:daily-digest:2026-08-01",
      reportDate: "2026-08-01",
      mode: "send",
      startedAt: "2026-08-01T00:01:00.000Z",
      stepName: "started"
    });
    const success = store.markCronRunSuccess(running.id, {
      finishedAt: "2026-08-01T00:01:01.000Z",
      stepName: "complete",
      candidateCount: 1
    });

    expect(store.findSuccessfulCronRun("hermes-cron:daily-digest:2026-08-01")).toEqual(success);
    expect(store.findSuccessfulCronRun("hermes-cron:daily-digest:2026-08-02")).toBeNull();
    expect(store.listCronRuns("2026-08-01")).toHaveLength(2);
    db.close();
  });

  it("prevents concurrent running send claims for the same cron idempotency key", () => {
    const { db, store } = openInitializedStore();
    const input = {
      idempotencyKey: "hermes-cron:daily-digest:2026-08-01",
      reportDate: "2026-08-01",
      mode: "send" as const,
      startedAt: "2026-08-01T00:00:00.000Z",
      stepName: "started"
    };

    store.createCronRun(input);

    expect(() =>
      store.createCronRun({
        ...input,
        startedAt: "2026-08-01T00:00:01.000Z"
      })
    ).toThrow(/UNIQUE constraint failed/);
    db.close();
  });
});
