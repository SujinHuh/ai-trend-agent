import type { ParsedSourceItem } from "./parsers/types.js";

export type VerificationStatus = "passed" | "needs_review" | "excluded";

export interface VerificationResult {
  status: VerificationStatus;
  reasons: string[];
  urlReachable: boolean | null;
  hasRequiredFields: boolean;
  withinWindow: boolean | null;
  duplicateOf: string | null;
  includedInReport: boolean;
}

export interface NormalizedIngestionItem extends ParsedSourceItem {
  verification: VerificationResult;
}

export interface NormalizeSourceItemsOptions {
  reportDate: string;
  timezone?: "Asia/Seoul";
}

export interface NormalizeSourceItemsResult {
  includedItems: NormalizedIngestionItem[];
  needsReviewItems: NormalizedIngestionItem[];
  excludedItems: NormalizedIngestionItem[];
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function normalizeSourceItems(
  items: ParsedSourceItem[],
  options: NormalizeSourceItemsOptions
): NormalizeSourceItemsResult {
  const window = createKstReportWindow(options.reportDate);
  const seen = new Map<string, string>();
  const includedItems: NormalizedIngestionItem[] = [];
  const needsReviewItems: NormalizedIngestionItem[] = [];
  const excludedItems: NormalizedIngestionItem[] = [];

  for (const item of items) {
    const reasons: string[] = [];
    const hasRequiredFields = item.title.trim().length > 0 && item.url.trim().length > 0;
    const duplicateOf = seen.get(item.canonicalHash) ?? null;

    if (!hasRequiredFields) {
      reasons.push("missing required title or url");
    }

    if (duplicateOf !== null) {
      reasons.push(`duplicate of ${duplicateOf}`);
    } else {
      seen.set(item.canonicalHash, item.canonicalUrl);
    }

    const withinWindow =
      item.effectivePublishedAt === null ? null : isWithinWindow(item.effectivePublishedAt, window.start, window.end);

    if (item.effectivePublishedAt === null) {
      reasons.push("missing effective published date");
    } else if (!withinWindow) {
      reasons.push("outside KST report window");
    }

    const status = getVerificationStatus({
      hasRequiredFields,
      duplicateOf,
      effectivePublishedAt: item.effectivePublishedAt,
      withinWindow
    });

    const normalized: NormalizedIngestionItem = {
      ...item,
      verification: {
        status,
        reasons,
        urlReachable: null,
        hasRequiredFields,
        withinWindow,
        duplicateOf,
        includedInReport: status === "passed"
      }
    };

    if (status === "passed") {
      includedItems.push(normalized);
    } else if (status === "needs_review") {
      needsReviewItems.push(normalized);
    } else {
      excludedItems.push(normalized);
    }
  }

  return {
    includedItems,
    needsReviewItems,
    excludedItems
  };
}

export function createKstReportWindow(reportDate: string): { start: string; end: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(reportDate)) {
    throw new Error(`Invalid report date: ${reportDate}`);
  }

  const startUtcMs = Date.parse(`${reportDate}T00:00:00.000Z`) - KST_OFFSET_MS;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString()
  };
}

function isWithinWindow(value: string, start: string, end: string): boolean {
  const timestamp = Date.parse(value);
  return timestamp >= Date.parse(start) && timestamp < Date.parse(end);
}

function getVerificationStatus(input: {
  hasRequiredFields: boolean;
  duplicateOf: string | null;
  effectivePublishedAt: string | null;
  withinWindow: boolean | null;
}): VerificationStatus {
  if (!input.hasRequiredFields || input.duplicateOf !== null || input.withinWindow === false) {
    return "excluded";
  }

  if (input.effectivePublishedAt === null) {
    return "needs_review";
  }

  return "passed";
}
