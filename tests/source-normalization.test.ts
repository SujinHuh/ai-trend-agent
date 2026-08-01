import { describe, expect, it } from "vitest";

import { createKstReportWindow, normalizeSourceItems } from "../src/sources/normalize-source-item.js";
import type { ParsedSourceItem } from "../src/sources/parsers/types.js";

describe("normalizeSourceItems", () => {
  it("splits included, needs-review, and excluded items with KST window rules", () => {
    const result = normalizeSourceItems(
      [
        item({ title: "inside", url: "https://example.com/inside", effectivePublishedAt: "2026-07-31T15:00:00.000Z" }),
        item({ title: "missing date", url: "https://example.com/missing", effectivePublishedAt: null }),
        item({ title: "outside", url: "https://example.com/outside", effectivePublishedAt: "2026-07-31T14:59:59.000Z" }),
        item({ title: "duplicate", url: "https://example.com/inside?utm_source=feed", effectivePublishedAt: "2026-07-31T16:00:00.000Z" })
      ],
      { reportDate: "2026-08-01" }
    );

    expect(result.includedItems.map((candidate) => candidate.title)).toEqual(["inside"]);
    expect(result.needsReviewItems.map((candidate) => candidate.title)).toEqual(["missing date"]);
    expect(result.excludedItems.map((candidate) => candidate.title)).toEqual(["outside", "duplicate"]);
    expect(result.excludedItems[1]?.verification.reasons).toContain("duplicate of https://example.com/inside");
  });

  it("creates Asia/Seoul report windows", () => {
    expect(createKstReportWindow("2026-08-01")).toEqual({
      start: "2026-07-31T15:00:00.000Z",
      end: "2026-08-01T15:00:00.000Z"
    });
  });
});

function item(input: { title: string; url: string; effectivePublishedAt: string | null }): ParsedSourceItem {
  const canonicalUrl = input.url.replace("?utm_source=feed", "");
  return {
    sourceId: "test-source",
    sourceName: "Test Source",
    title: input.title,
    url: input.url,
    canonicalUrl,
    canonicalHash: canonicalUrl,
    rawId: null,
    publishedAtRaw: input.effectivePublishedAt,
    publishedAt: input.effectivePublishedAt,
    updatedAtRaw: null,
    updatedAt: null,
    effectivePublishedAt: input.effectivePublishedAt,
    author: null,
    excerpt: null,
    tags: []
  };
}
