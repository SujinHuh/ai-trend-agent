import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getParserDispatch,
  loadSourceConfigs,
  normalizeSourceConfigs,
  SOURCE_CONFIG_DEFAULTS
} from "../src/sources/source-config.js";

describe("source registry config", () => {
  it("loads enabled official sources with defaults and descending priority order", () => {
    const sources = loadSourceConfigs();

    expect(sources.map((source) => source.id)).toEqual([
      "anthropic-news",
      "mistral-news",
      "huggingface-blog-feed",
      "github-openai-python-releases"
    ]);
    expect(sources.every((source) => source.enabled)).toBe(true);
    expect(sources.every((source) => source.credibility === "official")).toBe(true);

    const anthropicNews = sources.find((source) => source.id === "anthropic-news");
    expect(anthropicNews).toMatchObject({
      official: true,
      timezone: "UTC",
      rateLimit: SOURCE_CONFIG_DEFAULTS.rateLimit,
      retry: SOURCE_CONFIG_DEFAULTS.retry,
      canonicalizationRules: SOURCE_CONFIG_DEFAULTS.canonicalizationRules
    });
  });

  it("can validate disabled backlog sources without returning them for ingestion", () => {
    const allSources = loadSourceConfigs(undefined, { includeDisabled: true });
    const sourceIds = allSources.map((source) => source.id);

    expect(sourceIds).toContain("google-deepmind-blog");
    expect(sourceIds).toContain("mistral-news");
    expect(sourceIds).toContain("meta-ai-blog");
    expect(sourceIds).toContain("huggingface-blog-feed");
    expect(sourceIds).toContain("moonshot-kimi-blog");
    expect(sourceIds).toContain("deepseek-api-updates");
    expect(sourceIds).toContain("qwen-blog");
    expect(sourceIds).toContain("spring-news");
    expect(loadSourceConfigs().map((source) => source.id)).not.toContain("spring-news");
    expect(loadSourceConfigs().map((source) => source.id)).not.toContain("openai-news");
    expect(loadSourceConfigs().map((source) => source.id)).not.toContain("google-blog-feed");
  });

  it("derives parser dispatch from source type when parserType is omitted", () => {
    const [source] = normalizeSourceConfigs([
      {
        id: "derived-rss",
        name: "Derived RSS",
        type: "rss",
        url: "https://example.com/feed.xml",
        category: "llm_vendor",
        credibility: "official",
        enabled: true,
        priority: 1,
        tags: ["example"],
        fetchConfig: {
          timeoutMs: 5000,
          maxItemsPerFetch: 10,
          cacheTtlMinutes: 60
        }
      }
    ]);

    if (source === undefined) {
      throw new Error("Expected normalized source");
    }

    expect(source.parserType).toBe("rss_parser");
    expect(getParserDispatch(source)).toBe("rss_parser");
  });

  it("fails with an actionable error for incompatible parser types", () => {
    expect(() =>
      normalizeSourceConfigs([
        {
          id: "bad-parser",
          name: "Bad Parser",
          type: "rss",
          url: "https://example.com/feed.xml",
          category: "llm_vendor",
          credibility: "official",
          parserType: "html_list_parser",
          enabled: true,
          priority: 1,
          tags: ["example"],
          fetchConfig: {
            timeoutMs: 5000,
            maxItemsPerFetch: 10,
            cacheTtlMinutes: 60
          }
        }
      ])
    ).toThrow(/parserType "html_list_parser" is not compatible with source type "rss"/u);
  });

  it("fails with an actionable error when required fields are missing", () => {
    expect(() => normalizeSourceConfigs([{ id: "missing-name" }])).toThrow(/source\[0\]\.name: required/u);
  });

  it("loads a registry from an explicit file path", () => {
    const configDir = mkdtempSync(join(tmpdir(), "source-config-"));
    const configPath = join(configDir, "sources.json");
    writeFileSync(
      configPath,
      JSON.stringify([
        {
          id: "file-source",
          name: "File Source",
          type: "atom",
          url: "https://example.com/releases.atom",
          category: "developer_tool",
          credibility: "official",
          enabled: true,
          priority: 5,
          tags: ["example"],
          fetchConfig: {
            timeoutMs: 5000,
            maxItemsPerFetch: 10,
            cacheTtlMinutes: 60
          }
        }
      ])
    );

    expect(loadSourceConfigs(configPath)).toHaveLength(1);
    expect(loadSourceConfigs(configPath)[0]?.parserType).toBe("atom_parser");
  });

  it("accepts optional fetch headers for sources that need them", () => {
    const [source] = normalizeSourceConfigs([
      {
        id: "header-source",
        name: "Header Source",
        type: "rss",
        url: "https://example.com/feed.xml",
        category: "llm_vendor",
        credibility: "official",
        enabled: true,
        priority: 1,
        tags: ["example"],
        fetchConfig: {
          timeoutMs: 5000,
          maxItemsPerFetch: 10,
          cacheTtlMinutes: 60,
          headers: {
            "user-agent": "AITrendAgent/0.1"
          }
        }
      }
    ]);

    expect(source?.fetchConfig.headers).toEqual({
      "user-agent": "AITrendAgent/0.1"
    });
  });
});
