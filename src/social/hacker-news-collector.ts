import type { SocialSignalItem, SocialSignalSource } from "../domain/types.js";
import { normalizeSocialSignal } from "./normalize-social-signal.js";

export interface HackerNewsItem {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  title?: string;
  text?: string;
  url?: string;
  deleted?: boolean;
  dead?: boolean;
}

export function normalizeHackerNewsItems(input: {
  source: SocialSignalSource;
  items: HackerNewsItem[];
  collectedAt: string;
}): SocialSignalItem[] {
  if (input.source.platform !== "hacker_news") {
    throw new Error(`source ${input.source.id} is not a Hacker News source`);
  }

  return input.items
    .filter((item) => item.deleted !== true && item.dead !== true)
    .filter((item) => item.type === undefined || item.type === "story")
    .filter((item) => matchesKeywords(item, input.source.keywords))
    .map((item) =>
      normalizeSocialSignal(input.source, {
        sourceId: input.source.id,
        authorHandle: item.by ?? null,
        url: `https://news.ycombinator.com/item?id=${item.id}`,
        text: [item.title, item.text].filter(Boolean).join("\n"),
        publishedAt: item.time === undefined ? null : new Date(item.time * 1000).toISOString(),
        collectedAt: input.collectedAt,
        outboundUrls: item.url === undefined ? [] : [item.url],
        provenance: "hacker-news-firebase-api"
      })
    );
}

function matchesKeywords(item: HackerNewsItem, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }
  const haystack = [item.title, item.text, item.url].filter(Boolean).join(" ").toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}
