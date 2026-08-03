import type { DigestCandidate, SlackWebhookPayload } from "../domain/types.js";
import type { SourceDomain } from "../sources/source-config.js";

const MAX_SLACK_BLOCKS = 50;
const MAX_HEADER_TEXT_LENGTH = 150;
const MAX_SECTION_TEXT_LENGTH = 3000;
const MAX_FIELD_TEXT_LENGTH = 600;
const MAX_URGENT_TEXT_LENGTH = 2900;

export interface RenderSlackDigestInput {
  reportDate: string;
  candidates: DigestCandidate[];
  limit: number;
  sourceDomainsByName?: Map<string, SourceDomain>;
}

export function renderSlackDigest(input: RenderSlackDigestInput): SlackWebhookPayload {
  const candidates = input.candidates.slice(0, input.limit);
  const urgent = candidates.filter(isUrgentCandidate);
  const blocks: SlackWebhookPayload["blocks"] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: truncateText(`AI Trend Daily Digest - ${input.reportDate}`, MAX_HEADER_TEXT_LENGTH)
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateText(
          `*${candidates.length} Top AI Signal${candidates.length === 1 ? "" : "s"}* from the LLM Wiki.`,
          MAX_SECTION_TEXT_LENGTH
        )
      }
    },
    {
      type: "divider"
    }
  ];

  if (candidates.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateText("No ranked digest candidates are available for this date.", MAX_SECTION_TEXT_LENGTH)
      }
    });
  } else {
    pushCandidateBlocks(blocks, candidates, input.sourceDomainsByName);
  }

  if (blocks.length < MAX_SLACK_BLOCKS) {
    blocks.push({
      type: "divider"
    });
  }
  pushSectionBlock(
    blocks,
    urgent.length === 0
      ? "*Urgent:* none by conservative `do_now` criteria."
      : `*Urgent:* ${truncateText(
          urgent.map((candidate) => escapeSlackText(candidate.trendItem.title)).join(", "),
          MAX_URGENT_TEXT_LENGTH
        )}`
  );

  return {
    text: `AI Trend Daily Digest - ${input.reportDate}`,
    blocks
  };
}

function pushCandidateBlocks(
  blocks: SlackWebhookPayload["blocks"],
  candidates: DigestCandidate[],
  sourceDomainsByName: Map<string, SourceDomain> | undefined
): void {
  const sections = groupCandidatesByDomain(candidates, sourceDomainsByName);
  if (sections.length <= 1) {
    candidates.forEach((candidate, index) => {
      pushSectionBlock(blocks, renderCandidate(candidate, index + 1));
    });
    return;
  }

  let position = 1;
  for (const section of sections) {
    if (blocks.length < MAX_SLACK_BLOCKS) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: truncateText(`*${formatDomainLabel(section.domain)}*`, MAX_SECTION_TEXT_LENGTH)
        }
      });
    }
    for (const candidate of section.candidates) {
      pushSectionBlock(blocks, renderCandidate(candidate, position));
      position += 1;
    }
  }
}

function groupCandidatesByDomain(
  candidates: DigestCandidate[],
  sourceDomainsByName: Map<string, SourceDomain> | undefined
): { domain: SourceDomain; candidates: DigestCandidate[] }[] {
  const orderedDomains: SourceDomain[] = ["ai", "backend", "frontend", "devops"];
  const grouped = new Map<SourceDomain, DigestCandidate[]>(orderedDomains.map((domain) => [domain, []]));

  for (const candidate of candidates) {
    const sourceName = candidate.lineage[0]?.sourceName ?? candidate.trendItem.sourceName;
    const domain = sourceDomainsByName?.get(sourceName) ?? "ai";
    grouped.get(domain)?.push(candidate);
  }

  return orderedDomains.flatMap((domain) => {
    const sectionCandidates = grouped.get(domain) ?? [];
    return sectionCandidates.length === 0 ? [] : [{ domain, candidates: sectionCandidates }];
  });
}

function formatDomainLabel(domain: SourceDomain): string {
  const labels: Record<SourceDomain, string> = {
    ai: "AI",
    backend: "Backend",
    frontend: "Frontend",
    devops: "DevOps"
  };

  return `${labels[domain]} Signals`;
}

export function isUrgentCandidate(candidate: DigestCandidate): boolean {
  return (
    candidate.assessment.actionLevel === "do_now" &&
    (candidate.assessment.confirmationStatus === "confirmed" ||
      candidate.assessment.confirmationStatus === "official_only") &&
    candidate.assessment.confidence >= 0.85 &&
    candidate.assessment.importanceScore >= 80
  );
}

function renderCandidate(candidate: DigestCandidate, position: number): string {
  const sourceUrl = candidate.lineage[0]?.sourceUrl ?? candidate.trendItem.canonicalUrl;
  const canonicalLinkUrl = escapeSlackLinkUrl(candidate.trendItem.canonicalUrl);
  const sourceLinkUrl = escapeSlackLinkUrl(sourceUrl);
  const lines = [
    `*${position}. <${canonicalLinkUrl}|${truncateText(escapeSlackText(candidate.trendItem.title), 180)}>*`,
    `_${candidate.assessment.trendCategory} | ${candidate.assessment.actionLevel} | score ${candidate.assessment.importanceScore} | confidence ${candidate.assessment.confidence}_`,
    `*Summary:* ${truncateText(escapeSlackText(candidate.assessment.summary), MAX_FIELD_TEXT_LENGTH)}`,
    `*Why it matters:* ${truncateText(escapeSlackText(candidate.assessment.whyItMatters), MAX_FIELD_TEXT_LENGTH)}`,
    `*Practical impact:* ${truncateText(escapeSlackText(candidate.assessment.practicalImpact), MAX_FIELD_TEXT_LENGTH)}`,
    `*Source:* <${sourceLinkUrl}|${truncateText(escapeSlackText(candidate.trendItem.sourceName), 120)}>`,
    `*LLM Wiki ID:* \`${candidate.assessment.id}\``
  ];

  return truncateText(lines.join("\n"), MAX_SECTION_TEXT_LENGTH);
}

function escapeSlackText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeSlackLinkUrl(value: string): string {
  return value
    .trim()
    .replaceAll("|", "%7C")
    .replaceAll("<", "%3C")
    .replaceAll(">", "%3E")
    .replace(/\s/g, "%20");
}

function pushSectionBlock(blocks: SlackWebhookPayload["blocks"], text: string): void {
  if (blocks.length >= MAX_SLACK_BLOCKS) {
    return;
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: truncateText(text, MAX_SECTION_TEXT_LENGTH)
    }
  });
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return ".";
  }

  return `${value.slice(0, maxLength - 1)}.`;
}
