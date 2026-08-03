import type { DigestCandidate } from "../domain/types.js";
import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import { compareDigestCandidates } from "./rank-trend-items.js";

export function selectDigestCandidates(input: {
  store: LlmWikiStore;
  reportDate: string;
  limit: number;
  allowedSourceNames?: Set<string>;
}): DigestCandidate[] {
  return filterDigestCandidatesBySourceNames(
    input.store.listDigestCandidates(input.reportDate, input.limit),
    input.allowedSourceNames
  ).sort((left, right) =>
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

export function filterDigestCandidatesBySourceNames(
  candidates: DigestCandidate[],
  allowedSourceNames: Set<string> | undefined
): DigestCandidate[] {
  if (allowedSourceNames === undefined) {
    return [...candidates];
  }

  return candidates.filter((candidate) =>
    candidate.lineage.some((lineage) => allowedSourceNames.has(lineage.sourceName))
  );
}
