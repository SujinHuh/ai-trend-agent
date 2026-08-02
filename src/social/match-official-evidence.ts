import type { SourceEvidence } from "../domain/types.js";
import { canonicalizeUrl } from "../url/canonicalize-url.js";

export function matchOfficialEvidence(input: {
  outboundUrls: string[];
  officialDomainsToConfirm: string[];
  evidence: SourceEvidence[];
}): SourceEvidence[] {
  const officialDomains = new Set(input.officialDomainsToConfirm.map((domain) => domain.toLowerCase()));
  const outbound = new Set(
    input.outboundUrls.filter((url) => isAllowedOfficialHost(new URL(url).hostname, officialDomains)).map(canonicalizeUrl)
  );

  return input.evidence.filter((evidence) => outbound.has(canonicalizeUrl(evidence.sourceUrl)));
}

function isAllowedOfficialHost(hostname: string, officialDomains: Set<string>): boolean {
  const normalized = hostname.toLowerCase();
  return [...officialDomains].some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}
