import type {
  ConfirmationStatus,
  SourceEvidence,
  TrendAssessmentInput,
  TrendCategory,
  TrendItem
} from "../domain/types.js";
import type { SaveTrendAssessmentInput } from "../db/llm-wiki-store.js";
import { calculateConfidence, calculateImportanceScore } from "./rank-trend-items.js";
import { hasOfficialLineage, type SourceMetadataByName } from "./source-lineage.js";
import { actionLevelFromScore, applyTrustGate } from "./trust-gate.js";

export function createTrendSynthesis(input: {
  item: TrendAssessmentInput;
  reportDate: string;
  metadataByName: SourceMetadataByName;
  socialSignalCount?: number;
}): SaveTrendAssessmentInput {
  const trendCategory = classifyTrendCategory(input.item.trendItem, input.item.evidence);
  const confirmationStatus = determineConfirmationStatus(input.item.evidence, input.metadataByName);
  const importanceInput = {
    trendItem: input.item.trendItem,
    evidence: input.item.evidence,
    reportDate: input.reportDate,
    trendCategory,
    confirmationStatus,
    metadataByName: input.metadataByName,
    ...(input.socialSignalCount === undefined ? {} : { socialSignalCount: input.socialSignalCount })
  };
  const importanceScore = calculateImportanceScore(importanceInput);
  const desiredActionLevel = actionLevelFromScore({ importanceScore, confirmationStatus });

  return {
    trendItemId: input.item.trendItem.id,
    reportDate: input.reportDate,
    summary: createSummary(input.item.trendItem, input.item.evidence),
    whyItMatters: createWhyItMatters(trendCategory),
    practicalImpact: createPracticalImpact(trendCategory),
    trendCategory,
    actionLevel: applyTrustGate({ desiredActionLevel, confirmationStatus, importanceScore }),
    confirmationStatus,
    confidence: calculateConfidence({
      evidence: input.item.evidence,
      confirmationStatus,
      metadataByName: input.metadataByName
    }),
    importanceScore,
    contradictionNotes: null,
    stalenessPolicy: createStalenessPolicy(input.reportDate),
    sourceEvidenceIds: input.item.evidence.map((evidence) => evidence.id)
  };
}

function determineConfirmationStatus(
  evidence: SourceEvidence[],
  metadataByName: SourceMetadataByName
): ConfirmationStatus {
  if (hasOfficialLineage(evidence, metadataByName)) {
    return evidence.length > 1 ? "confirmed" : "official_only";
  }

  return "needs_confirmation";
}

function classifyTrendCategory(trendItem: TrendItem, evidence: SourceEvidence[]): TrendCategory {
  const text = [trendItem.title, ...evidence.map((item) => item.evidenceExcerpt ?? "")].join(" ").toLowerCase();

  if (/\b(agent|coding|code|developer|ide|cli)\b/.test(text)) {
    return "coding_agent";
  }

  if (/\b(model|claude|gpt|gemini|mistral|qwen|kimi|deepseek|llama)\b/.test(text)) {
    return "model";
  }

  if (/\b(open source|github|release|package|sdk|library)\b/.test(text)) {
    return "open_source";
  }

  if (/\b(benchmark|eval|leaderboard)\b/.test(text)) {
    return "benchmark";
  }

  if (/\b(safety|policy|alignment|risk)\b/.test(text)) {
    return "safety";
  }

  if (/\b(api|infra|cloud|server|latency|throughput)\b/.test(text)) {
    return "infra";
  }

  if (/\b(research|paper|study)\b/.test(text)) {
    return "research";
  }

  if (/\b(price|business|enterprise|customer|market)\b/.test(text)) {
    return "business";
  }

  return "product";
}

function createSummary(trendItem: TrendItem, evidence: SourceEvidence[]): string {
  const excerpt = evidence.find((item) => item.evidenceExcerpt !== null)?.evidenceExcerpt ?? undefined;
  if (excerpt !== undefined && excerpt.trim().length > 0) {
    return truncate(excerpt.trim(), 220);
  }

  return truncate(trendItem.title, 220);
}

function createWhyItMatters(category: TrendCategory): string {
  const messages: Record<TrendCategory, string> = {
    model: "Model changes can quickly affect tool choice, prompt strategy, and product capability assumptions.",
    coding_agent: "Coding-agent changes can affect daily development workflow and automation opportunities.",
    product: "Product launches can create immediate workflow or integration options.",
    open_source: "Open-source releases can be inspected, tested, and adopted without waiting for a vendor rollout.",
    benchmark: "Benchmark updates can change how competing models or tools should be compared.",
    infra: "Infrastructure updates can affect cost, latency, reliability, or deployment design.",
    safety: "Safety updates can affect policy, trust, and production-readiness decisions.",
    business: "Business updates can affect vendor direction, pricing, and ecosystem momentum.",
    research: "Research updates can signal techniques that may become practical later."
  };

  return messages[category];
}

function createPracticalImpact(category: TrendCategory): string {
  const messages: Record<TrendCategory, string> = {
    model: "Check whether the model changes should alter current evaluation or adoption plans.",
    coding_agent: "Review whether the workflow should be tested in a local coding task.",
    product: "Decide whether this belongs in the next manual evaluation queue.",
    open_source: "Inspect the release and consider a small local trial if it matches current needs.",
    benchmark: "Use the result as comparison context, not as a standalone adoption signal.",
    infra: "Check integration and operating constraints before changing architecture.",
    safety: "Treat as policy context and watch for official follow-up.",
    business: "Track for vendor strategy, but avoid immediate technical action unless linked to a product change.",
    research: "Watch for implementations, replications, or official productization."
  };

  return messages[category];
}

function createStalenessPolicy(reportDate: string): string {
  const recheck = new Date(`${reportDate}T00:00:00.000Z`);
  recheck.setUTCDate(recheck.getUTCDate() + 14);
  return `Recheck after ${recheck.toISOString().slice(0, 10)} if not superseded by newer official evidence.`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}.`;
}
