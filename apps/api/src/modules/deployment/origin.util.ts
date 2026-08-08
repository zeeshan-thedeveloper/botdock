/**
 * Whether a request Origin is allowed to use a deployment, per its bot's
 * registered allowed-domain patterns. Pure and side-effect free — reused by
 * CHAT-005's widget runtime as-is.
 *
 * Matching rules:
 * - Host only; scheme and port are ignored (so `localhost`/`127.0.0.1`
 *   patterns match on any port automatically).
 * - Exact host match: `shop.acme.com`.
 * - Wildcard subdomain `*.acme.com` matches any subdomain, never the apex
 *   unless the apex is also listed as its own pattern.
 * - A missing Origin (JS `null`) is always rejected. The literal string
 *   `"null"` (what browsers send for sandboxed/opaque origins) is rejected
 *   unless a pattern explicitly lists `"null"`.
 * - An empty pattern list rejects everything (fail closed).
 */
export function isOriginAllowed(origin: string | null, patterns: string[]): boolean {
  if (patterns.length === 0 || origin === null) {
    return false;
  }

  const normalizedPatterns = patterns.map((pattern) => pattern.trim().toLowerCase()).filter(Boolean);

  if (origin === 'null') {
    return normalizedPatterns.includes('null');
  }

  const host = getHostname(origin);
  if (!host) {
    return false;
  }

  return normalizedPatterns.some((pattern) => matchesPattern(host, pattern));
}

function getHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesPattern(host: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".acme.com"
    return host.length > suffix.length && host.endsWith(suffix);
  }

  return host === pattern;
}
