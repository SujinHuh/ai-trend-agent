import type { SourceCredibility, NormalizedSourceConfig } from "../sources/source-config.js";
import type { SourceEvidence } from "../domain/types.js";

export interface SourceMetadata {
  name: string;
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
        credibility: source.credibility,
        priority: source.priority,
        tags: source.tags
      }
    ])
  );
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
