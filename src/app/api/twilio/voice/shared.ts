import "server-only";

import { env } from "@/lib/env";
import { candidateUrlsFor, validateTwilioSignature } from "@/lib/twilio/security";

/**
 * Parses a Twilio webhook POST and validates its signature (§9: every
 * webhook signature-validated). Returns the params, or null when the
 * request is not provably from Twilio.
 */
export async function parseValidTwilioRequest(
  request: Request
): Promise<Record<string, string> | null> {
  if (!env.TWILIO_AUTH_TOKEN) {
    console.error("[twilio] TWILIO_AUTH_TOKEN not configured — rejecting webhook");
    return null;
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  const ok = validateTwilioSignature({
    signature: request.headers.get("x-twilio-signature"),
    candidateUrls: candidateUrlsFor(request),
    params,
    authToken: env.TWILIO_AUTH_TOKEN,
  });
  if (!ok) {
    console.warn("[twilio] webhook signature validation failed");
    return null;
  }
  return params;
}

export const forbidden = () => new Response("Forbidden", { status: 403 });
