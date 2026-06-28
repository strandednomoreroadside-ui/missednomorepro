/**
 * SSRF guard for customer-supplied webhook URLs. Endpoints are owner/admin-
 * configured (semi-trusted), but we still refuse to POST to internal targets
 * — loopback, private ranges, link-local (incl. cloud metadata 169.254.169.254),
 * and internal hostnames — so a webhook can't be turned into a probe of our
 * own network. Checked at creation AND at delivery (defense in depth; the
 * delivery fetch also uses redirect:"manual" so a 302 can't bounce inward).
 *
 * Note: hostnames that resolve to private IPs via DNS aren't caught here
 * (would need resolve-then-pin, and DNS rebinding can still race). This blocks
 * the literal-IP / obvious-internal cases, which is the proportionate bar for
 * an authenticated, owner-configured destination.
 */
export function isSafeWebhookUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false; // no creds-in-URL

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Internal hostnames.
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return false;
  }

  // IPv4 literals in loopback / private / link-local / CGNAT ranges.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return false;
    const [a, b] = o;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    return true;
  }

  // IPv6 literals: loopback, unspecified, ULA (fc00::/7), link-local (fe80::/10).
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return false;
    if (/^f[cd]/.test(host)) return false;
    if (/^fe[89ab]/.test(host)) return false;
    return true;
  }

  return true;
}
