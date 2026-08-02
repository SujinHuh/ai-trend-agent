import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import type { NormalizedSourceConfig } from "../sources/source-config.js";
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
  const items = input.store.listTrendAssessmentInputsForReportDate(input.reportDate);

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
    candidateCount: input.store.listDigestCandidates(input.reportDate, input.limit).length
  };
}
