import type { SourceCredibility, SourceDomain, NormalizedSourceConfig } from "../sources/source-config.js";
import { DOMAIN_RANKING_WEIGHTS } from "../sources/source-config.js";
import type { SourceEvidence } from "../domain/types.js";

export interface SourceMetadata {
  name: string;
  domain: SourceDomain;
  credibility: SourceCredibility;
  priority: number;
  tags: string[];
}

export type SourceMetadataByName = Map<string, SourceMetadata>;

export function createSourceMetadataByName(sources: NormalizedSourceConfig[]): SourceMetadataByName {
  return new Map(
    sources.map((source) => [
      source.name,
      {
        name: source.name,
        domain: source.domain,
        credibility: source.credibility,
        priority: source.priority,
        tags: source.tags
      }
    ])
  );
}

export function getMaxDomainRankingWeight(evidence: SourceEvidence[], metadataByName: SourceMetadataByName): number {
  return evidence.reduce((maxWeight, sourceEvidence) => {
    const domain = metadataByName.get(sourceEvidence.sourceName)?.domain ?? "ai";
    return Math.max(maxWeight, DOMAIN_RANKING_WEIGHTS[domain]);
  }, 0);
}

export function getSourceDomain(sourceName: string, metadataByName: SourceMetadataByName): SourceDomain {
  return metadataByName.get(sourceName)?.domain ?? "ai";
}

export function hasOfficialLineage(evidence: SourceEvidence[], metadataByName: SourceMetadataByName): boolean {
  return evidence.some((sourceEvidence) => {
    const metadata = metadataByName.get(sourceEvidence.sourceName);
    return metadata?.credibility === "official" || metadata?.credibility === "official_aggregated";
  });
}

export function getMaxSourcePriority(evidence: SourceEvidence[], metadataByName: SourceMetadataByName): number {
  return evidence.reduce((maxPriority, sourceEvidence) => {
    const priority = metadataByName.get(sourceEvidence.sourceName)?.priority ?? 0;
    return Math.max(maxPriority, priority);
  }, 0);
}
