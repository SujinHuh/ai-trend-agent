import type { ParsedSourceItem, ParseResult, ParseSkippedItem, SourceParserContext } from "./types.js";
import {
  createCanonicalFields,
  decodeEntities,
  dedupeByCanonicalUrl,
  normalizeWhitespace,
  parseDateValue,
  resolveSourceUrl
} from "./parse-utils.js";

export interface HtmlParserConfig {
  itemSelector: string;
  titleSelector: string;
  urlSelector: string;
  dateSelector?: string;
  authorSelector?: string;
  excerptSelector?: string;
}

interface HtmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: HtmlNode[];
  text: string;
}

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

export function parseHtmlList(html: string, config: HtmlParserConfig, context: SourceParserContext): ParseResult {
  const root = parseHtml(html);
  const itemNodes = queryAll(root, config.itemSelector);

  if (itemNodes.length === 0) {
    throw new Error(`HTML parser selector failed: itemSelector "${config.itemSelector}" matched 0 nodes`);
  }

  const items: ParsedSourceItem[] = [];
  const skippedItems: ParseSkippedItem[] = [];

  itemNodes.forEach((itemNode, index) => {
    const title = readSelectorText(itemNode, config.titleSelector);
    const rawUrl = readSelectorHref(itemNode, config.urlSelector);

    if (title === null || title.length === 0 || rawUrl === null || rawUrl.length === 0) {
      skippedItems.push({ index, reason: "missing title or url" });
      return;
    }

    const url = resolveSourceUrl(rawUrl, context.sourceUrl);
    const publishedAtRaw = readOptionalText(itemNode, config.dateSelector);
    const updatedAtRaw = null;
    const publishedAt = parseDateValue(publishedAtRaw);
    const canonical = createCanonicalFields(url);

    items.push({
      sourceId: context.sourceId,
      sourceName: context.sourceName,
      title,
      url,
      ...canonical,
      rawId: null,
      publishedAtRaw,
      publishedAt,
      updatedAtRaw,
      updatedAt: null,
      effectivePublishedAt: publishedAt,
      author: readOptionalText(itemNode, config.authorSelector),
      excerpt: readOptionalText(itemNode, config.excerptSelector),
      tags: []
    });
  });

  return {
    items: dedupeByCanonicalUrl(items),
    skippedItems
  };
}

function readOptionalText(node: HtmlNode, selector: string | undefined): string | null {
  return selector === undefined ? null : readSelectorText(node, selector);
}

function readSelectorText(node: HtmlNode, selector: string): string | null {
  const selected = selector === "self" ? node : queryAll(node, selector)[0];
  if (selected === undefined) {
    return null;
  }

  const text = nodeText(selected);
  return text.length === 0 ? null : text;
}

function readSelectorHref(node: HtmlNode, selector: string): string | null {
  const selected = selector === "self" ? node : queryAll(node, selector)[0];
  const href = selected?.attributes.href;
  return href === undefined || href.trim().length === 0 ? null : href;
}

function parseHtml(html: string): HtmlNode {
  const root: HtmlNode = { tagName: "#root", attributes: {}, children: [], text: "" };
  const stack = [root];
  const tokenPattern = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/giu;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(html)) !== null) {
    const token = match[0];
    const parent = stack.at(-1) ?? root;

    if (token.startsWith("<!--") || token.toLowerCase().startsWith("<!doctype")) {
      continue;
    }

    if (token.startsWith("</")) {
      const closingTag = token.slice(2, -1).trim().toLowerCase();
      while (stack.length > 1) {
        const current = stack.pop();
        if (current?.tagName === closingTag) {
          break;
        }
      }
      continue;
    }

    if (token.startsWith("<")) {
      const parsedTag = parseTag(token);
      if (parsedTag === null) {
        continue;
      }

      parent.children.push(parsedTag);
      if (!token.endsWith("/>") && !VOID_TAGS.has(parsedTag.tagName)) {
        stack.push(parsedTag);
      }
      continue;
    }

    parent.text += decodeEntities(token);
  }

  return root;
}

function parseTag(token: string): HtmlNode | null {
  const match = /^<([a-zA-Z][\w:-]*)([\s\S]*?)\/?>$/u.exec(token);
  const tagName = match?.[1]?.toLowerCase();
  const attrs = match?.[2] ?? "";

  if (tagName === undefined) {
    return null;
  }

  return {
    tagName,
    attributes: parseAttributes(attrs),
    children: [],
    text: ""
  };
}

function parseAttributes(value: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const name = match[1]?.toLowerCase();
    if (name === undefined) {
      continue;
    }

    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attributes;
}

function queryAll(root: HtmlNode, selector: string): HtmlNode[] {
  const parts = selector.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) {
    return [];
  }

  let current = [root];
  for (const part of parts) {
    current = current.flatMap((node) => descendants(node).filter((candidate) => matchesSimpleSelector(candidate, part)));
  }

  return current;
}

function descendants(node: HtmlNode): HtmlNode[] {
  const found: HtmlNode[] = [];
  const visit = (current: HtmlNode) => {
    for (const child of current.children) {
      found.push(child);
      visit(child);
    }
  };

  visit(node);
  return found;
}

function matchesSimpleSelector(node: HtmlNode, selector: string): boolean {
  const attrSelector = readAttributeSelector(selector);
  const selectorWithoutAttr = attrSelector === null ? selector : selector.slice(0, attrSelector.startIndex);
  const match = /^(?<tag>[a-zA-Z][\w:-]*)?(?:#(?<id>[\w:-]+))?(?:\.(?<classes>[\w:.-]+))?$/u.exec(selectorWithoutAttr);
  const groups = match?.groups;

  if (groups === undefined) {
    return false;
  }

  const tag = groups.tag?.toLowerCase();
  const id = groups.id;
  const classes = groups.classes?.split(".").filter(Boolean) ?? [];

  if (tag !== undefined && node.tagName !== tag) {
    return false;
  }

  if (id !== undefined && node.attributes.id !== id) {
    return false;
  }

  const classList = new Set((node.attributes.class ?? "").split(/\s+/u).filter(Boolean));
  if (!classes.every((className) => classList.has(className))) {
    return false;
  }

  if (attrSelector !== null) {
    const actual = node.attributes[attrSelector.name];
    if (actual === undefined) {
      return false;
    }

    if (attrSelector.operator === "=") {
      return actual === attrSelector.value;
    }

    return actual.includes(attrSelector.value);
  }

  return true;
}

function readAttributeSelector(selector: string): {
  startIndex: number;
  name: string;
  operator: "=" | "*=";
  value: string;
} | null {
  const match = /\[(?<name>[\w:-]+)(?<operator>\*=|=)["']?(?<value>[^"'\]]+)["']?\]$/u.exec(selector);
  const groups = match?.groups;

  if (match === null || groups === undefined) {
    return null;
  }

  return {
    startIndex: match.index,
    name: groups.name?.toLowerCase() ?? "",
    operator: groups.operator === "*=" ? "*=" : "=",
    value: groups.value ?? ""
  };
}

function nodeText(node: HtmlNode): string {
  const parts = [node.text];
  for (const child of node.children) {
    parts.push(nodeText(child));
  }

  return normalizeWhitespace(parts.join(" "));
}
