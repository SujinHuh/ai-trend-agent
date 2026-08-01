import { describe, expect, it } from "vitest";

import { canonicalizeUrl } from "../src/url/canonicalize-url.js";

describe("canonicalizeUrl", () => {
  it("normalizes tracking differences into the same canonical URL", () => {
    expect(
      canonicalizeUrl("http://Example.COM/news/?utm_source=slack&b=2&a=1&fbclid=abc#section")
    ).toBe("https://example.com/news?a=1&b=2");
  });

  it("removes a root trailing slash", () => {
    expect(canonicalizeUrl("https://example.com/")).toBe("https://example.com");
  });

  it("sorts duplicate query keys by value for deterministic canonical URLs", () => {
    expect(canonicalizeUrl("https://example.com/news?tag=z&tag=a&page=2")).toBe(
      "https://example.com/news?page=2&tag=a&tag=z"
    );
  });

  it("removes tracking parameters case-insensitively", () => {
    expect(canonicalizeUrl("https://example.com/news?UTM_Source=x&Ref=feed&Source=rss&id=42")).toBe(
      "https://example.com/news?id=42"
    );
  });
});
