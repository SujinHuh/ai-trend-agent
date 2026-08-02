import type { SocialSignalItem, SocialSignalSource } from "../domain/types.js";
import { extractOutboundUrls, normalizeSocialSignal } from "./normalize-social-signal.js";

export function normalizeRedditRss(input: {
  source: SocialSignalSource;
  xml: string;
  collectedAt: string;
}): SocialSignalItem[] {
  if (input.source.platform !== "reddit") {
    throw new Error(`source ${input.source.id} is not a Reddit source`);
  }

  return extractEntries(input.xml)
    .filter((entry) => matchesKeywords(entry, input.source.keywords))
    .map((entry) => {
      const text = [entry.title, entry.content].filter(Boolean).join("\n");
      return normalizeSocialSignal(input.source, {
        sourceId: input.source.id,
        authorHandle: entry.author,
        url: entry.link,
        text,
        publishedAt: entry.published,
        collectedAt: input.collectedAt,
        outboundUrls: extractOutboundUrls(text),
        provenance: "reddit-rss"
      });
    });
}

interface RedditEntry {
  title: string;
  link: string;
  author: string | null;
  published: string | null;
  content: string;
}

function extractEntries(xml: string): RedditEntry[] {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/giu) ?? [];
  return entries.map((entry) => ({
    title: readTag(entry, "title") ?? "Untitled Reddit signal",
    link: readHref(entry) ?? readTag(entry, "id") ?? "",
    author: readTag(readTagBlock(entry, "author") ?? "", "name"),
    published: readTag(entry, "updated") ?? readTag(entry, "published"),
    content: stripTags(readTag(entry, "content") ?? readTag(entry, "summary") ?? "")
  })).filter((entry) => entry.link.length > 0);
}

function matchesKeywords(entry: RedditEntry, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }
  const haystack = [entry.title, entry.content, entry.link].join(" ").toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function readHref(xml: string): string | null {
  const match = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/iu);
  return match?.[1] ?? null;
}

function readTag(xml: string, tag: string): string | null {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = xml.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, "iu"));
  return match?.[1] === undefined ? null : decodeXml(match[1]).trim();
}

function readTagBlock(xml: string, tag: string): string | null {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return xml.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapedTag}>`, "iu"))?.[0] ?? null;
}

function stripTags(value: string): string {
  return decodeXml(value.replace(/<[^>]*>/gu, " ")).replace(/\s+/gu, " ").trim();
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
