import "server-only";

import { env } from "@/lib/env";

import { candidateUrlsFor, validateTwilioSignature } from "./security";

/**
 * Parses a Twilio webhook POST and validates its signature (§9: every
 * webhook signature-validated). Returns the params, or null when the
 * request is not provably from Twilio. Shared by the voice and SMS
 * webhooks + status callbacks.
 */
export async function parseValidTwilioRequest(
  request: Request
): Promise<Record<string, string> | null> {
  if (!env.TWILIO_AUTH_TOKEN) {
    console.error("[twilio] TWILIO_AUTH_TOKEN not configured — rejecting webhook");
    return null;
  }

  // A body Twilio could never have sent (missing or non-form Content-Type) is
  // not a Twilio request. formData() throws on those, and an unhandled throw
  // here turns every stray bot probe of a public webhook URL into a 500 + alert.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    console.warn("[twilio] webhook body was not form-encoded — rejecting");
    return null;
  }
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
