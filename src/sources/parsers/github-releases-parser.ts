import { parseRssAtomFeed } from "./rss-atom-parser.js";
import type { ParseResult, SourceParserContext } from "./types.js";

export function parseGitHubReleasesAtom(feedXml: string, context: SourceParserContext): ParseResult {
  const result = parseRssAtomFeed(feedXml, context);

  return {
    items: result.items.map((item) => ({
      ...item,
      publishedAtRaw: item.publishedAtRaw,
      publishedAt: item.publishedAt,
      effectivePublishedAt: item.publishedAt ?? item.updatedAt,
      tags: [...new Set([...item.tags, "developer_tool"])]
    })),
    skippedItems: result.skippedItems
  };
}
