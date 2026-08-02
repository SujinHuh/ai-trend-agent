# Task 007 Requirements - Social Allow-List Signal Ingestion

## Purpose

Task 007 adds fast AI social/community signal collection without treating social posts as confirmed facts.

This task is not generic web scraping. It must use official APIs, RSS, public JSON APIs, or manual exports unless a source explicitly allows HTML collection.

## Channels

| Channel | Collection method | Enabled by default | Default confirmation |
| --- | --- | --- | --- |
| X/Twitter | X API recent search or user timeline | No | `needs_confirmation` |
| Threads | Meta Threads API or manual export | No | `needs_confirmation` |
| Reddit | Reddit API or subreddit/search RSS | No | `needs_confirmation` |
| Hacker News | official Firebase API | No | `needs_confirmation` |
| Newsletter/manual | RSS or user-provided JSONL/markdown export | No | `needs_confirmation` |

## Required Registries

1. trusted individual registry
2. official org social registry
3. community source registry

## SocialSignalSource Shape

```ts
interface SocialSignalSource {
  id: string;
  platform: "x" | "threads" | "reddit" | "hacker_news" | "newsletter" | "manual";
  displayName: string;
  credibility: "trusted_individual" | "official_social" | "community";
  collectionMethod: "api" | "rss" | "manual_export" | "html_if_allowed";
  enabled: boolean;
  defaultConfirmationStatus: "needs_confirmation";
  handles?: string[];
  accountIds?: string[];
  subreddits?: string[];
  keywords?: string[];
  officialDomainsToConfirm?: string[];
  policyReviewedAt?: string;
  policyNotes?: string;
  rateLimit: {
    maxRequestsPerWindow: number;
    windowSeconds: number;
  };
  security: {
    requiresToken: boolean;
    secretEnvName?: string;
  };
}
```

## SocialSignalItem Shape

```ts
interface SocialSignalItem {
  sourceId: string;
  platform: string;
  authorHandle?: string;
  authorDisplayName?: string;
  url: string;
  canonicalUrl: string;
  text: string;
  publishedAt?: string;
  collectedAt: string;
  outboundUrls: string[];
  confirmationStatus: "needs_confirmation" | "confirmed_by_official_link" | "multi_signal_unconfirmed" | "contradicted";
  linkedOfficialEvidenceIds: string[];
}
```

## Security Rules

1. API tokens must come from environment variables or Secret Manager.
2. Authorization headers must never be cached.
3. Browser scraping that bypasses login, robots, or platform controls is out of scope.
4. deleted/private content must not be retained from unofficial exports.
5. social item text must be clearly labeled as unconfirmed in downstream digest logic.
6. manual imports must include a public URL, source provenance, and no deleted/private/screenshot/private chat markers.
7. confidence promotion must match existing canonical `SourceEvidence` or an explicit official domain registry entry.

## Acceptance Criteria

- social registries validate.
- collectors are disabled by default.
- X/Threads require explicit token configuration.
- Reddit/HN can be tested through fixtures before live runs.
- every social item defaults to `needs_confirmation`.
- official source matching is required for confidence promotion.
- X/Threads collectors remain deferred until token scopes, current rate limits, and app review constraints are recorded.
