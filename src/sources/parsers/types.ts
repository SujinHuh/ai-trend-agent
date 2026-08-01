export interface ParsedSourceItem {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  canonicalUrl: string;
  canonicalHash: string;
  rawId: string | null;
  publishedAtRaw: string | null;
  publishedAt: string | null;
  updatedAtRaw: string | null;
  updatedAt: string | null;
  effectivePublishedAt: string | null;
  author: string | null;
  excerpt: string | null;
  tags: string[];
}

export interface ParseSkippedItem {
  index: number;
  reason: string;
}

export interface ParseResult {
  items: ParsedSourceItem[];
  skippedItems: ParseSkippedItem[];
}

export interface SourceParserContext {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
}
