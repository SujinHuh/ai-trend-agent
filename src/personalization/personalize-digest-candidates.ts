import type {
  DigestCandidate,
  PersonalizationFeedback,
  UserInterestProfile
} from "../domain/types.js";
import type { SourceMetadataByName } from "../synthesis/source-lineage.js";
import { compareDigestCandidates } from "../synthesis/rank-trend-items.js";

const HIGH_TAG_BOOST = 10;
const NORMAL_TAG_BOOST = 4;
const LEARNED_TAG_BOOST = 6;
const DIRECT_INTEREST_BOOST = 15;
const SAVE_LATER_BOOST = 3;

export interface PersonalizationResult {
  candidate: DigestCandidate;
  personalizationBoost: number;
  matchedTags: string[];
}

export function personalizeDigestCandidates(input: {
  candidates: DigestCandidate[];
  profile: UserInterestProfile;
  feedback: PersonalizationFeedback[];
  metadataByName: SourceMetadataByName;
  historicalTagsByTrendItemId?: Map<string, string[]>;
  limit: number;
}): PersonalizationResult[] {
  const latestFeedback = getLatestFeedbackByTrendItemId(input.feedback);
  const candidateTags = new Map(
    input.candidates.map((candidate) => [candidate.trendItem.id, getCandidateInterestTags(candidate, input.metadataByName)])
  );
  const learnedTags = new Set<string>();
  for (const feedback of latestFeedback.values()) {
    if (feedback.action !== "interested") {
      continue;
    }
    const tags = candidateTags.get(feedback.trendItemId) ?? input.historicalTagsByTrendItemId?.get(feedback.trendItemId) ?? [];
    tags.forEach((tag) => learnedTags.add(tag));
  }

  return input.candidates
    .flatMap((candidate): PersonalizationResult[] => {
      const tags = candidateTags.get(candidate.trendItem.id) ?? [];
      const metadata = getPrimaryMetadata(candidate, input.metadataByName);
      const latestAction = latestFeedback.get(candidate.trendItem.id)?.action;
      if (latestAction === "hide") {
        return [];
      }
      if (!input.profile.enabledDomains.includes(metadata?.domain ?? "ai")) {
        return [];
      }
      if (tags.some((tag) => input.profile.mutedTags.includes(tag))) {
        return [];
      }
      const searchableText = `${candidate.trendItem.title} ${candidate.assessment.summary}`.toLowerCase();
      if (input.profile.blockedKeywords.some((keyword) => searchableText.includes(keyword))) {
        return [];
      }

      const highMatches = tags.filter((tag) => input.profile.highPriorityTags.includes(tag));
      const normalMatches = tags.filter((tag) => input.profile.normalPriorityTags.includes(tag));
      const learnedMatches = tags.filter((tag) => learnedTags.has(tag));
      const boost =
        Math.min(highMatches.length * HIGH_TAG_BOOST, 20) +
        Math.min(normalMatches.length * NORMAL_TAG_BOOST, 8) +
        Math.min(learnedMatches.length * LEARNED_TAG_BOOST, 12) +
        (latestAction === "interested" ? DIRECT_INTEREST_BOOST : 0) +
        (latestAction === "save_later" ? SAVE_LATER_BOOST : 0);

      return [{
        candidate,
        personalizationBoost: boost,
        matchedTags: [...new Set([...highMatches, ...normalMatches, ...learnedMatches])].sort()
      }];
    })
    .sort((left, right) => {
      const leftScore = left.candidate.assessment.importanceScore + left.personalizationBoost;
      const rightScore = right.candidate.assessment.importanceScore + right.personalizationBoost;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return compareDigestCandidates(toComparable(left.candidate), toComparable(right.candidate));
    })
    .slice(0, input.limit);
}

export function getCandidateInterestTags(
  candidate: DigestCandidate,
  metadataByName: SourceMetadataByName
): string[] {
  const metadata = getPrimaryMetadata(candidate, metadataByName);
  return normalizeTags([
    candidate.assessment.trendCategory,
    candidate.assessment.trendCategory.replaceAll("_", "-"),
    metadata?.domain ?? "ai",
    ...(metadata?.tags ?? [])
  ]);
}

function getLatestFeedbackByTrendItemId(feedback: PersonalizationFeedback[]): Map<string, PersonalizationFeedback> {
  const sorted = [...feedback].sort((left, right) => {
    const time = right.occurredAt.localeCompare(left.occurredAt);
    return time === 0 ? right.id.localeCompare(left.id) : time;
  });
  const latest = new Map<string, PersonalizationFeedback>();
  for (const event of sorted) {
    if (!latest.has(event.trendItemId)) {
      latest.set(event.trendItemId, event);
    }
  }
  return latest;
}

function getPrimaryMetadata(candidate: DigestCandidate, metadataByName: SourceMetadataByName) {
  for (const lineage of candidate.lineage) {
    const metadata = metadataByName.get(lineage.sourceName);
    if (metadata !== undefined) {
      return metadata;
    }
  }
  return metadataByName.get(candidate.trendItem.sourceName);
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort();
}

function toComparable(candidate: DigestCandidate) {
  return {
    importanceScore: candidate.assessment.importanceScore,
    confidence: candidate.assessment.confidence,
    publishedAt: candidate.trendItem.publishedAt,
    trendItemId: candidate.trendItem.id
  };
}
