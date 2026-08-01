const TRACKING_PARAMS = new Set(["fbclid", "gclid", "ref", "source"]);

export function canonicalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  const protocol = parsed.protocol === "http:" || parsed.protocol === "https:" ? "https:" : parsed.protocol;
  const hostname = parsed.hostname.toLowerCase();
  const port = shouldKeepPort(protocol, parsed.port) ? `:${parsed.port}` : "";
  const pathname = normalizePathname(parsed.pathname);
  const query = normalizeQuery(parsed.searchParams);

  return `${protocol}//${hostname}${port}${pathname}${query}`;
}

function shouldKeepPort(protocol: string, port: string): boolean {
  if (port.length === 0) {
    return false;
  }

  return !((protocol === "https:" && port === "443") || (protocol === "http:" && port === "80"));
}

function normalizePathname(pathname: string): string {
  if (pathname === "/" || pathname.length === 0) {
    return "";
  }

  return pathname.replace(/\/+$/u, "");
}

function normalizeQuery(searchParams: URLSearchParams): string {
  const entries = [...searchParams.entries()]
    .filter(([key]) => !isTrackingParam(key))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const keyComparison = leftKey.localeCompare(rightKey);
      return keyComparison === 0 ? leftValue.localeCompare(rightValue) : keyComparison;
    });

  if (entries.length === 0) {
    return "";
  }

  const normalized = new URLSearchParams();
  for (const [key, value] of entries) {
    normalized.append(key, value);
  }

  return `?${normalized.toString()}`;
}

function isTrackingParam(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return normalizedKey.startsWith("utm_") || TRACKING_PARAMS.has(normalizedKey);
}
