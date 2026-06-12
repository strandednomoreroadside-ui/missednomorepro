import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Twilio webhook signature validation (master plan §9: every webhook
 * signature-validated). Twilio signs: full request URL + each POST
 * param's key+value concatenated in alphabetical key order, HMAC-SHA1
 * with the auth token, base64. https://www.twilio.com/docs/usage/security
 */
export function twilioSignatureFor(
  url: string,
  params: Record<string, string>,
  authToken: string
): string {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Validates a request against one or more candidate URLs (the proxy
 * may present the request under the forwarded host and/or the
 * configured app URL — the signature only matches the exact URL
 * Twilio called, so forged headers can't help an attacker).
 */
export function validateTwilioSignature(opts: {
  signature: string | null;
  candidateUrls: string[];
  params: Record<string, string>;
  authToken: string;
}): boolean {
  if (!opts.signature) return false;
  return opts.candidateUrls.some((url) =>
    safeEqual(twilioSignatureFor(url, opts.params, opts.authToken), opts.signature as string)
  );
}

/** The URLs this request may have been signed against. */
export function candidateUrlsFor(request: Request): string[] {
  const { pathname, search } = new URL(request.url);
  const urls = new Set<string>();

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  for (const h of [forwardedHost, host]) {
    if (h) urls.add(`${proto}://${h}${pathname}${search}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) urls.add(`${appUrl.replace(/\/$/, "")}${pathname}${search}`);

  urls.add(request.url);
  return [...urls];
}
