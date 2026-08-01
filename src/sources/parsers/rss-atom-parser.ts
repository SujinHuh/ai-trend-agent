import type { ParsedSourceItem, ParseResult, ParseSkippedItem, SourceParserContext } from "./types.js";
import {
  createCanonicalFields,
  decodeEntities,
  dedupeByCanonicalUrl,
  normalizeWhitespace,
  parseDateValue,
  resolveSourceUrl,
  stripTags
} from "./parse-utils.js";

export function parseRssAtomFeed(feedXml: string, context: SourceParserContext): ParseResult {
  const entries = extractBlocks(feedXml, "entry");
  const rssItems = entries.length > 0 ? [] : extractBlocks(feedXml, "item");
  const blocks = entries.length > 0 ? entries : rssItems;
  if (blocks.length === 0) {
    if (looksLikeFeedDocument(feedXml)) {
      return {
        items: [],
        skippedItems: []
      };
    }

    throw new Error("RSS/Atom parser found no entry or item blocks");
  }

  const items: ParsedSourceItem[] = [];
  const skippedItems: ParseSkippedItem[] = [];

  blocks.forEach((block, index) => {
    try {
      const title = readText(block, "title");
      const rawUrl = entries.length > 0 ? readAtomLink(block) : readText(block, "link");

      if (title === null || title.length === 0) {
        skippedItems.push({ index, reason: "missing title" });
        return;
      }

      if (rawUrl === null || rawUrl.length === 0) {
        skippedItems.push({ index, reason: "missing link" });
        return;
      }

      const url = resolveSourceUrl(rawUrl, context.sourceUrl);
      const publishedAtRaw = firstNonNull(readText(block, "published"), readText(block, "pubDate"), readText(block, "dc:date"));
      const updatedAtRaw = firstNonNull(readText(block, "updated"), readText(block, "lastBuildDate"));
      const publishedAt = parseDateValue(publishedAtRaw);
      const updatedAt = parseDateValue(updatedAtRaw);
      const canonical = createCanonicalFields(url);

      items.push({
        sourceId: context.sourceId,
        sourceName: context.sourceName,
        title,
        url,
        ...canonical,
        rawId: firstNonNull(readText(block, "id"), readText(block, "guid")),
        publishedAtRaw,
        publishedAt,
        updatedAtRaw,
        updatedAt,
        effectivePublishedAt: publishedAt ?? updatedAt,
        author: readAuthor(block),
        excerpt: firstNonNull(readText(block, "summary"), readText(block, "description"), readText(block, "content")),
        tags: []
      });
    } catch (error) {
      skippedItems.push({
        index,
        reason: error instanceof Error ? error.message : "unknown parser error"
      });
    }
  });

  return {
    items: dedupeByCanonicalUrl(items),
    skippedItems
  };
}

function looksLikeFeedDocument(xml: string): boolean {
  return /<(?:rss|feed|channel)\b/iu.test(xml);
}

function extractBlocks(xml: string, tagName: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "giu");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const block = match[1];
    if (block !== undefined) {
      blocks.push(block);
    }
  }

  return blocks;
}

function readText(xml: string, tagName: string): string | null {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "iu");
  const match = pattern.exec(xml);
  const value = match?.[1];

  if (value === undefined) {
    return null;
  }

  return stripTags(value);
}

function readAtomLink(xml: string): string | null {
  const linkPattern = /<link\b([^>]*)>/giu;
  let fallback: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(xml)) !== null) {
    const attrs = match[1] ?? "";
    const href = readAttribute(attrs, "href");

    if (href === null) {
      continue;
    }

    const rel = readAttribute(attrs, "rel");
    if (rel === null || rel === "alternate") {
      return href;
    }

    fallback ??= href;
  }

  return fallback;
}

function readAuthor(xml: string): string | null {
  const authorBlock = extractBlocks(xml, "author")[0];
  if (authorBlock !== undefined) {
    return firstNonNull(readText(authorBlock, "name"), normalizeXmlText(authorBlock));
  }

  return firstNonNull(readText(xml, "dc:creator"), readText(xml, "author"));
}

function normalizeXmlText(value: string): string | null {
  const normalized = normalizeWhitespace(decodeEntities(stripTags(value)));
  return normalized.length === 0 ? null : normalized;
}

function readAttribute(attributes: string, name: string): string | null {
  const pattern = new RegExp(`${escapeRegExp(name)}\\s*=\\s*["']([^"']+)["']`, "iu");
  return pattern.exec(attributes)?.[1] ?? null;
}

function firstNonNull<T>(...values: Array<T | null>): T | null {
  return values.find((value): value is T => value !== null) ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
