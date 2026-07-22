/**
 * Sentry PII scrubbing (master plan §9 / §14: "no PII in logs"). Applied as
 * a `beforeSend` on every Sentry init. Defense-in-depth on top of
 * sendDefaultPii:false — it walks the outgoing event and redacts phone
 * numbers, emails, and long digit runs (cards/account numbers), and drops
 * obviously-sensitive request/object fields entirely.
 *
 * Deliberately framework-agnostic (no Sentry type import) so the three
 * runtime configs can all share it.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Any run of 9+ digits with optional separators — covers phone numbers,
// card numbers, and account ids in one pass.
const NUMBER_RE = /\b\d[\d ().+-]{8,}\d\b/g;

/** Keys whose values are never safe to send, redacted wholesale. */
const SENSITIVE_KEY_RE =
  /cookie|authorization|x-twilio|x-retell|password|secret|token|api[_-]?key|raw_text|redacted_text|transcript|message_body/i;

function redactUrlQuery(s: string): string {
  if (!s.includes("?") && !s.startsWith("/")) return s;
  try {
    const absolute = /^[a-z][a-z\d+.-]*:\/\//i.test(s);
    const url = new URL(s, "https://redaction.invalid");
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, "[redacted]");
      changed = true;
    }
    if (!changed) return s;
    return absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return s;
  }
}

function redactString(s: string): string {
  return redactUrlQuery(s)
    .replace(EMAIL_RE, "[email]")
    .replace(NUMBER_RE, "[number]");
}

function scrub(value: unknown, depth: number): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEY_RE.test(key)) {
        obj[key] = "[redacted]";
      } else {
        obj[key] = scrub(obj[key], depth + 1);
      }
    }
    return obj;
  }
  return value;
}

/** beforeSend hook: returns the scrubbed event (or null to drop it). */
export function scrubEvent<T>(event: T): T {
  const e = event as { request?: Record<string, unknown> } | null;
  if (e?.request) {
    // Cookies + headers can carry session tokens / IPs — never send them.
    delete e.request.cookies;
    delete e.request.headers;
  }
  return scrub(event, 0) as T;
}
