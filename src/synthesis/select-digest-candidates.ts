import type { DigestCandidate } from "../domain/types.js";
import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import { compareDigestCandidates } from "./rank-trend-items.js";

export function selectDigestCandidates(input: {
  store: LlmWikiStore;
  reportDate: string;
  limit: number;
}): DigestCandidate[] {
  return [...input.store.listDigestCandidates(input.reportDate, input.limit)].sort((left, right) =>
    compareDigestCandidates(
      {
        importanceScore: left.assessment.importanceScore,
        confidence: left.assessment.confidence,
        publishedAt: left.trendItem.publishedAt,
        trendItemId: left.trendItem.id
      },
      {
        importanceScore: right.assessment.importanceScore,
        confidence: right.assessment.confidence,
        publishedAt: right.trendItem.publishedAt,
        trendItemId: right.trendItem.id
      }
    )
  );
}
