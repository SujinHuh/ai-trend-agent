export interface TrendItem {
  id: string;
  canonicalUrl: string;
  canonicalHash: string;
  title: string;
  sourceName: string;
  publishedAt: string | null;
}

export interface Digest {
  id: string;
  reportDate: string;
  timezone: "Asia/Seoul";
  generatedAt: string;
}

export interface DigestTrendItem {
  digestId: string;
  trendItemId: string;
  position: number;
}

export interface SourceEvidence {
  id: string;
  trendItemId: string;
  sourceUrl: string;
  sourceName: string;
  fetchedAt: string;
  evidenceExcerpt: string | null;
  confidenceScore: number;
}

export interface DigestWithItems {
  digest: Digest;
  items: TrendItem[];
  evidence: SourceEvidence[];
}

export type TrendCategory =
  | "model"
  | "coding_agent"
  | "product"
  | "open_source"
  | "benchmark"
  | "infra"
  | "safety"
  | "business"
  | "research";

export type ActionLevel = "do_now" | "do_next" | "watch_later" | "needs_confirmation";

export type ConfirmationStatus = "confirmed" | "official_only" | "needs_confirmation" | "conflicting" | "excluded";

export interface TrendAssessment {
  id: string;
  trendItemId: string;
  reportDate: string;
  summary: string;
  whyItMatters: string;
  practicalImpact: string;
  trendCategory: TrendCategory;
  actionLevel: ActionLevel;
  confirmationStatus: ConfirmationStatus;
  confidence: number;
  importanceScore: number;
  contradictionNotes: string | null;
  stalenessPolicy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrendAssessmentLineage {
  assessmentId: string;
  sourceEvidenceId: string;
  sourceName: string;
  sourceUrl: string;
  confidenceScore: number;
}

export interface TrendAssessmentInput {
  trendItem: TrendItem;
  evidence: SourceEvidence[];
}

export interface DigestCandidate {
  assessment: TrendAssessment;
  trendItem: TrendItem;
  lineage: TrendAssessmentLineage[];
}

export type SlackDeliveryStatus = "success" | "failed";

export interface SlackDeliveryAttempt {
  id: string;
  reportDate: string;
  webhookHost: string;
  status: SlackDeliveryStatus;
  httpStatusCode: number | null;
  errorMessage: string | null;
  sentAt: string;
  payloadHash: string;
}

export interface SlackTextObject {
  type: "mrkdwn" | "plain_text";
  text: string;
}

export interface SlackSectionBlock {
  type: "section";
  text: SlackTextObject;
}

export interface SlackDividerBlock {
  type: "divider";
}

export interface SlackHeaderBlock {
  type: "header";
  text: SlackTextObject;
}

export type SlackBlock = SlackHeaderBlock | SlackSectionBlock | SlackDividerBlock;

export interface SlackWebhookPayload {
  text: string;
  blocks: SlackBlock[];
}

export type CronRunMode = "dry_run" | "send";
export type CronRunStatus = "running" | "success" | "failed";

export interface CronRun {
  id: string;
  idempotencyKey: string;
  reportDate: string;
  mode: CronRunMode;
  status: CronRunStatus;
  startedAt: string;
  finishedAt: string | null;
  stepName: string;
  candidateCount: number | null;
  slackAttemptId: string | null;
  errorMessage: string | null;
}

export type SocialPlatform = "x" | "threads" | "reddit" | "hacker_news" | "newsletter" | "manual";
export type SocialCredibility = "trusted_individual" | "official_social" | "community";
export type SocialCollectionMethod = "api" | "rss" | "manual_export" | "html_if_allowed";
export type SocialConfirmationStatus =
  | "needs_confirmation"
  | "confirmed_by_official_link"
  | "multi_signal_unconfirmed"
  | "contradicted";

export interface SocialSignalSource {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  credibility: SocialCredibility;
  collectionMethod: SocialCollectionMethod;
  enabled: boolean;
  defaultConfirmationStatus: "needs_confirmation";
  handles: string[];
  accountIds: string[];
  subreddits: string[];
  keywords: string[];
  officialDomainsToConfirm: string[];
  policyReviewedAt: string | null;
  policyNotes: string | null;
  rateLimit: {
    maxRequestsPerWindow: number;
    windowSeconds: number;
  };
  security: {
    requiresToken: boolean;
    secretEnvName: string | null;
  };
}

export interface SocialSignalItem {
  id: string;
  sourceId: string;
  platform: SocialPlatform;
  authorHandle: string | null;
  authorDisplayName: string | null;
  url: string;
  canonicalUrl: string;
  text: string;
  publishedAt: string | null;
  collectedAt: string;
  outboundUrls: string[];
  confirmationStatus: SocialConfirmationStatus;
  linkedOfficialEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}
