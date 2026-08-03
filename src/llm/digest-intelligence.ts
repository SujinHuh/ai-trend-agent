import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { ActionLevel, DigestCandidate, LlmUsageLog } from "../domain/types.js";
import { applyTrustGate } from "../synthesis/trust-gate.js";
import { selectDigestCandidates } from "../synthesis/select-digest-candidates.js";

export const DEFAULT_LLM_DIGEST_CANDIDATE_LIMIT = 5;
export const MAX_LLM_DIGEST_CANDIDATE_LIMIT = 10;
const MAX_PROMPT_TEXT_LENGTH = 900;
const MAX_RESPONSE_TEXT_LENGTH = 700;

export interface LlmTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface DigestIntelligenceProviderRequest {
  reportDate: string;
  prompt: string;
  candidates: DigestPromptCandidate[];
}

export interface DigestIntelligenceProviderResult {
  rawText: string;
  usage: LlmTokenUsage;
}

export interface DigestIntelligenceProvider {
  providerName: string;
  modelName: string;
  generateDigestIntelligence(request: DigestIntelligenceProviderRequest): Promise<DigestIntelligenceProviderResult>;
}

export interface DigestPromptCandidate {
  trendItemId: string;
  title: string;
  canonicalUrl: string;
  sourceName: string;
  publishedAt: string | null;
  summary: string;
  whyItMatters: string;
  practicalImpact: string;
  trendCategory: string;
  actionLevel: ActionLevel;
  confirmationStatus: string;
  confidence: number;
  importanceScore: number;
  sourceUrls: string[];
}

export interface ParsedDigestEnrichment {
  trendItemId: string;
  summary?: string;
  whyItMatters?: string;
  practicalImpact?: string;
  importanceScore?: number;
  actionLevel?: ActionLevel;
  urgency?: "high" | "medium" | "low";
  userInterestRelevance?: "high" | "medium" | "low";
}

export interface EnrichDigestCandidatesInput {
  store: LlmWikiStore;
  reportDate: string;
  provider?: DigestIntelligenceProvider | null;
  enabled?: boolean;
  limit?: number;
  maxDailyCostUsd?: number;
  pricePerMillionInputTokensUsd?: number;
  pricePerMillionOutputTokensUsd?: number;
  now?: () => string;
}

export interface EnrichDigestCandidatesResult {
  reportDate: string;
  enabled: boolean;
  candidateCount: number;
  enrichedCount: number;
  fallbackReason: string | null;
  usageLog: LlmUsageLog | null;
}

export function buildDigestIntelligencePrompt(input: {
  reportDate: string;
  candidates: DigestCandidate[];
  limit?: number;
}): DigestIntelligenceProviderRequest {
  const promptCandidates = input.candidates
    .slice(0, clampCandidateLimit(input.limit ?? DEFAULT_LLM_DIGEST_CANDIDATE_LIMIT))
    .map(toPromptCandidate);
  const prompt = JSON.stringify(
    {
      task: "digest_intelligence",
      reportDate: input.reportDate,
      rules: [
        "Return strict JSON only.",
        "Do not claim social-only or unconfirmed signals are confirmed.",
        "Do not include secrets, credentials, API keys, auth codes, webhooks, or tokens.",
        "Use only the supplied candidate facts."
      ],
      outputSchema: {
        items: [
          {
            trendItemId: "string",
            summary: "string",
            whyItMatters: "string",
            practicalImpact: "string",
            importanceScore: "0-100 integer",
            actionLevel: "do_now | do_next | watch_later | needs_confirmation",
            urgency: "high | medium | low",
            userInterestRelevance: "high | medium | low"
          }
        ]
      },
      candidates: promptCandidates
    },
    null,
    2
  );

  return {
    reportDate: input.reportDate,
    prompt: redactSecrets(prompt),
    candidates: promptCandidates
  };
}

export function parseDigestIntelligenceResponse(input: {
  rawText: string;
  allowedTrendItemIds: string[];
}): ParsedDigestEnrichment[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawText);
  } catch {
    throw new Error("Invalid digest intelligence response: malformed JSON");
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
    throw new Error("Invalid digest intelligence response: missing items array");
  }

  const allowed = new Set(input.allowedTrendItemIds);
  return parsed.items.map((item) => parseEnrichmentItem(item, allowed));
}

export async function enrichDigestCandidatesWithLlm(
  input: EnrichDigestCandidatesInput
): Promise<EnrichDigestCandidatesResult> {
  const enabled = input.enabled === true;
  const now = input.now ?? (() => new Date().toISOString());
  const limit = clampCandidateLimit(input.limit ?? DEFAULT_LLM_DIGEST_CANDIDATE_LIMIT);
  const candidates = selectDigestCandidates({
    store: input.store,
    reportDate: input.reportDate,
    limit
  });

  if (!enabled || input.provider == null || candidates.length === 0) {
    return {
      reportDate: input.reportDate,
      enabled,
      candidateCount: candidates.length,
      enrichedCount: 0,
      fallbackReason: !enabled ? "llm_disabled" : input.provider == null ? "provider_missing" : "no_candidates",
      usageLog: null
    };
  }

  const provider = input.provider;
  const request = buildDigestIntelligencePrompt({
    reportDate: input.reportDate,
    candidates,
    limit
  });
  const maxDailyCostUsd = input.maxDailyCostUsd ?? Number.POSITIVE_INFINITY;
  const pricePerMillionInputTokensUsd = input.pricePerMillionInputTokensUsd ?? 0;
  const pricePerMillionOutputTokensUsd = input.pricePerMillionOutputTokensUsd ?? 0;
  const currentDailyCostUsd = input.store
    .listLlmUsageLogs(input.reportDate)
    .reduce((total, log) => total + log.estimatedCostUsd, 0);

  if (currentDailyCostUsd >= maxDailyCostUsd) {
    return logFallback(input, provider, candidates.length, now(), "daily_cost_cap_already_exceeded");
  }

  try {
    const response = await provider.generateDigestIntelligence(request);
    const estimatedCostUsd = estimateLlmCostUsd({
      usage: response.usage,
      pricePerMillionInputTokensUsd,
      pricePerMillionOutputTokensUsd
    });

    if (currentDailyCostUsd + estimatedCostUsd > maxDailyCostUsd) {
      return logFallback(input, provider, candidates.length, now(), "daily_cost_cap_exceeded", response.usage, estimatedCostUsd);
    }

    try {
      const enrichments = parseDigestIntelligenceResponse({
        rawText: response.rawText,
        allowedTrendItemIds: candidates.map((candidate) => candidate.trendItem.id)
      });
      const enrichmentByTrendItemId = new Map(enrichments.map((item) => [item.trendItemId, item]));
      let enrichedCount = 0;

      for (const candidate of candidates) {
        const enrichment = enrichmentByTrendItemId.get(candidate.trendItem.id);
        if (enrichment === undefined) {
          continue;
        }
        input.store.saveTrendAssessment({
          trendItemId: candidate.trendItem.id,
          reportDate: candidate.assessment.reportDate,
          summary: enrichment.summary ?? candidate.assessment.summary,
          whyItMatters: enrichment.whyItMatters ?? candidate.assessment.whyItMatters,
          practicalImpact: enrichment.practicalImpact ?? candidate.assessment.practicalImpact,
          trendCategory: candidate.assessment.trendCategory,
          actionLevel: applyTrustGate({
            desiredActionLevel: enrichment.actionLevel ?? candidate.assessment.actionLevel,
            confirmationStatus: candidate.assessment.confirmationStatus,
            importanceScore: enrichment.importanceScore ?? candidate.assessment.importanceScore
          }),
          confirmationStatus: candidate.assessment.confirmationStatus,
          confidence: candidate.assessment.confidence,
          importanceScore: enrichment.importanceScore ?? candidate.assessment.importanceScore,
          contradictionNotes: candidate.assessment.contradictionNotes,
          stalenessPolicy: candidate.assessment.stalenessPolicy,
          sourceEvidenceIds: candidate.lineage.map((lineage) => lineage.sourceEvidenceId)
        });
        enrichedCount += 1;
      }

      const usageLog = input.store.saveLlmUsageLog({
        reportDate: input.reportDate,
        purpose: "digest_intelligence",
        providerName: provider.providerName,
        modelName: provider.modelName,
        candidateCount: candidates.length,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        estimatedCostUsd,
        status: "success",
        createdAt: now()
      });

      return {
        reportDate: input.reportDate,
        enabled,
        candidateCount: candidates.length,
        enrichedCount,
        fallbackReason: null,
        usageLog
      };
    } catch (error) {
      return logFallback(
        input,
        provider,
        candidates.length,
        now(),
        error instanceof Error ? error.message : String(error),
        response.usage,
        estimatedCostUsd
      );
    }
  } catch (error) {
    return logFallback(input, provider, candidates.length, now(), error instanceof Error ? error.message : String(error));
  }
}

export function estimateLlmCostUsd(input: {
  usage: LlmTokenUsage;
  pricePerMillionInputTokensUsd: number;
  pricePerMillionOutputTokensUsd: number;
}): number {
  const inputCost = (input.usage.inputTokens / 1_000_000) * input.pricePerMillionInputTokensUsd;
  const outputCost = (input.usage.outputTokens / 1_000_000) * input.pricePerMillionOutputTokensUsd;
  return Number((inputCost + outputCost).toFixed(8));
}

export function redactSecrets(value: string): string {
  return value
    .replace(/https:\/\/hooks\.slack\.com\/services\/[^\s"'<>\\]+/gi, "[REDACTED_SLACK_WEBHOOK_URL]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|xox[abprs]-[A-Za-z0-9-]{8,}|gh[pousr]_[A-Za-z0-9_]{8,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(api[_-]?key|token|secret|auth[_-]?code|code)=([^&\s"'<>\\]+)/gi, "$1=[REDACTED]")
    .replace(/\b(CRON_SECRET|SLACK_WEBHOOK_URL|OAUTH_TOKEN|API_KEY|AUTH_CODE)\b/g, "[REDACTED_ENV_NAME]");
}

function toPromptCandidate(candidate: DigestCandidate): DigestPromptCandidate {
  return {
    trendItemId: candidate.trendItem.id,
    title: truncatePromptText(candidate.trendItem.title),
    canonicalUrl: redactSecrets(candidate.trendItem.canonicalUrl),
    sourceName: truncatePromptText(candidate.trendItem.sourceName),
    publishedAt: candidate.trendItem.publishedAt,
    summary: truncatePromptText(candidate.assessment.summary),
    whyItMatters: truncatePromptText(candidate.assessment.whyItMatters),
    practicalImpact: truncatePromptText(candidate.assessment.practicalImpact),
    trendCategory: candidate.assessment.trendCategory,
    actionLevel: candidate.assessment.actionLevel,
    confirmationStatus: candidate.assessment.confirmationStatus,
    confidence: candidate.assessment.confidence,
    importanceScore: candidate.assessment.importanceScore,
    sourceUrls: candidate.lineage.map((lineage) => redactSecrets(lineage.sourceUrl)).slice(0, 3)
  };
}

function parseEnrichmentItem(item: unknown, allowed: Set<string>): ParsedDigestEnrichment {
  if (!isRecord(item) || typeof item.trendItemId !== "string") {
    throw new Error("Invalid digest intelligence response: item missing trendItemId");
  }
  if (!allowed.has(item.trendItemId)) {
    throw new Error(`Invalid digest intelligence response: unknown trendItemId ${item.trendItemId}`);
  }
  if (item.actionLevel !== undefined && !isActionLevel(item.actionLevel)) {
    throw new Error(`Invalid digest intelligence response: invalid actionLevel for ${item.trendItemId}`);
  }
  if (item.urgency !== undefined && !isTriLevel(item.urgency)) {
    throw new Error(`Invalid digest intelligence response: invalid urgency for ${item.trendItemId}`);
  }
  if (item.userInterestRelevance !== undefined && !isTriLevel(item.userInterestRelevance)) {
    throw new Error(`Invalid digest intelligence response: invalid userInterestRelevance for ${item.trendItemId}`);
  }

  return {
    trendItemId: item.trendItemId,
    ...(typeof item.summary === "string" ? { summary: truncateResponseText(item.summary) } : {}),
    ...(typeof item.whyItMatters === "string" ? { whyItMatters: truncateResponseText(item.whyItMatters) } : {}),
    ...(typeof item.practicalImpact === "string" ? { practicalImpact: truncateResponseText(item.practicalImpact) } : {}),
    ...(typeof item.importanceScore === "number" ? { importanceScore: clampScore(item.importanceScore) } : {}),
    ...(isActionLevel(item.actionLevel) ? { actionLevel: item.actionLevel } : {}),
    ...(isTriLevel(item.urgency) ? { urgency: item.urgency } : {}),
    ...(isTriLevel(item.userInterestRelevance) ? { userInterestRelevance: item.userInterestRelevance } : {})
  };
}

function logFallback(
  input: EnrichDigestCandidatesInput,
  provider: DigestIntelligenceProvider,
  candidateCount: number,
  createdAt: string,
  reason: string,
  usage: LlmTokenUsage = { inputTokens: 0, outputTokens: 0 },
  estimatedCostUsd = 0
): EnrichDigestCandidatesResult {
  const usageLog = input.store.saveLlmUsageLog({
    reportDate: input.reportDate,
    purpose: "digest_intelligence",
    providerName: provider.providerName,
    modelName: provider.modelName,
    candidateCount,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd,
    status: "fallback",
    errorMessage: reason,
    createdAt
  });

  return {
    reportDate: input.reportDate,
    enabled: true,
    candidateCount,
    enrichedCount: 0,
    fallbackReason: reason,
    usageLog
  };
}

function clampCandidateLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_LLM_DIGEST_CANDIDATE_LIMIT;
  }
  return Math.max(0, Math.min(MAX_LLM_DIGEST_CANDIDATE_LIMIT, Math.trunc(value)));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncatePromptText(value: string): string {
  return truncateText(redactSecrets(value), MAX_PROMPT_TEXT_LENGTH);
}

function truncateResponseText(value: string): string {
  return truncateText(redactSecrets(value), MAX_RESPONSE_TEXT_LENGTH);
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}.`;
}

function isActionLevel(value: unknown): value is ActionLevel {
  return value === "do_now" || value === "do_next" || value === "watch_later" || value === "needs_confirmation";
}

function isTriLevel(value: unknown): value is "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
