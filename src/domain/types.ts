export interface TrendItem {
  id: string;
  canonicalUrl: string;
  canonicalHash: string;
  title: string;
  sourceName: string;
  publishedAt: string | null;
}

export interface Digest {
  id: string;
  reportDate: string;
  timezone: "Asia/Seoul";
  generatedAt: string;
}

export interface DigestTrendItem {
  digestId: string;
  trendItemId: string;
  position: number;
}

export interface SourceEvidence {
  id: string;
  trendItemId: string;
  sourceUrl: string;
  sourceName: string;
  fetchedAt: string;
  evidenceExcerpt: string | null;
  confidenceScore: number;
}

export interface DigestWithItems {
  digest: Digest;
  items: TrendItem[];
  evidence: SourceEvidence[];
}
