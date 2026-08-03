import type { DigestCandidate } from "../domain/types.js";
import type { LlmWikiStore } from "../db/llm-wiki-store.js";
import { getCandidateInterestTags, personalizeDigestCandidates } from "../personalization/personalize-digest-candidates.js";
import type { SourceMetadataByName } from "./source-lineage.js";
import { compareDigestCandidates } from "./rank-trend-items.js";

export function selectDigestCandidates(input: {
  store: LlmWikiStore;
  reportDate: string;
  limit: number;
  allowedSourceNames?: Set<string>;
  userProfileId?: string;
  metadataByName?: SourceMetadataByName;
}): DigestCandidate[] {
  const candidates = filterDigestCandidatesBySourceNames(
    input.store.listDigestCandidates(input.reportDate),
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

  if (input.userProfileId === undefined) {
    return candidates.slice(0, input.limit);
  }
  if (input.metadataByName === undefined) {
    throw new Error("metadataByName is required for personalized candidate selection");
  }
  const profile = input.store.getUserInterestProfile(input.userProfileId);
  if (profile === null) {
    throw new Error(`Unknown user profile: ${input.userProfileId}`);
  }
  const feedback = input.store.listPersonalizationFeedback(
    profile.id,
    getFeedbackCutoff(input.reportDate, profile.preferredDeliveryTime)
  );
  const historicalTagsByTrendItemId = new Map<string, string[]>();
  for (const event of feedback) {
    if (historicalTagsByTrendItemId.has(event.trendItemId)) {
      continue;
    }
    const assessment = input.store.getLatestTrendAssessmentForTrendItem(event.trendItemId);
    const trendItem = input.store.getTrendItem(event.trendItemId);
    if (assessment === null || trendItem === null) {
      continue;
    }
    historicalTagsByTrendItemId.set(
      event.trendItemId,
      getCandidateInterestTags({
        assessment,
        trendItem,
        lineage: input.store.listTrendAssessmentLineage(assessment.id)
      }, input.metadataByName)
    );
  }

  return personalizeDigestCandidates({
    candidates,
    profile,
    feedback,
    metadataByName: input.metadataByName,
    historicalTagsByTrendItemId,
    limit: input.limit
  }).map((result) => result.candidate);
}

export function getFeedbackCutoff(reportDate: string, preferredDeliveryTime: string): string {
  const [year, month, day] = reportDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid report date: ${reportDate}`);
  }
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(preferredDeliveryTime);
  if (timeMatch === null) {
    throw new Error(`Invalid preferred delivery time: ${preferredDeliveryTime}`);
  }
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) {
    throw new Error(`Invalid preferred delivery time: ${preferredDeliveryTime}`);
  }
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0)).toISOString();
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
