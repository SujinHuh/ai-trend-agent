import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { TrendAssessmentInput } from "../domain/types.js";
import type { NormalizedSourceConfig } from "../sources/source-config.js";
import { filterDigestCandidatesBySourceNames } from "./select-digest-candidates.js";
import { createTrendSynthesis } from "./create-trend-synthesis.js";
import { createSourceMetadataByName } from "./source-lineage.js";

export interface RunTrendSynthesisResult {
  reportDate: string;
  assessedCount: number;
  candidateCount: number;
}

export function runTrendSynthesis(input: {
  store: LlmWikiStore;
  reportDate: string;
  sources: NormalizedSourceConfig[];
  limit: number;
}): RunTrendSynthesisResult {
  const metadataByName = createSourceMetadataByName(input.sources);
  const allowedSourceNames = new Set(input.sources.map((source) => source.name));
  const items = input.store
    .listTrendAssessmentInputsForReportDate(input.reportDate)
    .flatMap((item) => filterAssessmentInputBySourceNames(item, allowedSourceNames));

  for (const item of items) {
    const socialSignalCount = input.store.countSocialSignalsLinkedToEvidence(item.evidence.map((evidence) => evidence.id));
    input.store.saveTrendAssessment(
      createTrendSynthesis({
        item,
        reportDate: input.reportDate,
        metadataByName,
        socialSignalCount
      })
    );
  }

  return {
    reportDate: input.reportDate,
    assessedCount: items.length,
    candidateCount: filterDigestCandidatesBySourceNames(
      input.store.listDigestCandidates(input.reportDate, input.limit),
      allowedSourceNames
    ).length
  };
}

function filterAssessmentInputBySourceNames(
  item: TrendAssessmentInput,
  allowedSourceNames: Set<string>
): TrendAssessmentInput[] {
  const evidence = item.evidence.filter((sourceEvidence) => allowedSourceNames.has(sourceEvidence.sourceName));
  if (evidence.length === 0) {
    return [];
  }

  return [{ trendItem: item.trendItem, evidence }];
}
