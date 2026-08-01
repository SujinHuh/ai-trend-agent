import { describe, expect, it } from "vitest";

import {
  createCanonicalHash,
  createDigestId,
  createEvidenceId,
  createTrendIdentity
} from "../src/identity/stable-id.js";

describe("stable identity", () => {
  it("creates deterministic trend identities from canonical URLs", () => {
    const left = createTrendIdentity("https://example.com/news?utm_campaign=x&a=1");
    const right = createTrendIdentity("http://EXAMPLE.com/news?a=1#fragment");

    expect(left).toEqual(right);
    expect(left.canonicalHash).toBe(createCanonicalHash(left.canonicalUrl));
    expect(left.id).toMatch(/^trend_[a-f0-9]{16}$/u);
  });

  it("creates deterministic digest IDs from report date", () => {
    expect(createDigestId("2026-07-29")).toBe("digest_2026-07-29");
  });

  it("keeps SourceEvidence IDs distinct when source names differ", () => {
    const input = {
      trendItemId: "trend_example",
      sourceUrl: "https://example.com/news?utm_source=feed",
      fetchedAt: "2026-07-29T00:00:00.000Z"
    };

    expect(createEvidenceId({ ...input, sourceName: "Official Blog" })).not.toBe(
      createEvidenceId({ ...input, sourceName: "Mirror Feed" })
    );
  });
});
