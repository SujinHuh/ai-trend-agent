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
