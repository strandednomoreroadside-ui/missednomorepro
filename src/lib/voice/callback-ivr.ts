import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { gatherDigitsTwiml, twimlResponse } from "@/lib/twilio/twiml";

/** A card on file — same anti-fraud gate the other outbound-call features
 *  use, so a not-yet-paying tenant's staff can't run up our Twilio bill. */
const CARDED_STATUSES = new Set(["active", "trialing", "past_due"]);

function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

/**
 * "Call your own business number" callback IVR (no app needed). If this
 * inbound call is FROM a known staff member's own phone AND the business has
 * the feature turned on (with a PIN set), intercept it here — before the AI
 * or greeting ever runs — and start the PIN prompt. Returns null (fall
 * through to the normal call path) for everyone else, so real customers
 * never see or hear this.
 */
export async function maybeStartCallbackIvr(
  admin: SupabaseClient,
  business: { id: string; tenant_id: string },
  fromNumber: string
): Promise<Response | null> {
  if (!env.INTERNAL_API_SECRET || !fromNumber) return null;

  const { data: settings } = await admin
    .from("sms_settings")
    .select("callback_ivr_enabled, callback_ivr_pin")
    .eq("business_id", business.id)
    .maybeSingle();
  const pin = (settings?.callback_ivr_pin as string | null) ?? null;
  if (!settings?.callback_ivr_enabled || !pin) return null;

  // Only a number already on file as a staff contact can trigger this.
  const { data: staff } = await admin
    .from("staff_contacts")
    .select("id")
    .eq("tenant_id", business.tenant_id)
    .eq("business_id", business.id)
    .eq("phone", fromNumber)
    .maybeSingle();
  if (!staff) return null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("status")
    .eq("tenant_id", business.tenant_id)
    .maybeSingle();
  if (!sub || !CARDED_STATUSES.has((sub as { status: string }).status)) return null;

  const actionUrl =
    `${appUrl()}/api/twilio/voice/ivr/pin` +
    `?tid=${encodeURIComponent(business.tenant_id)}` +
    `&bid=${encodeURIComponent(business.id)}` +
    `&key=${encodeURIComponent(env.INTERNAL_API_SECRET)}`;

  return twimlResponse(
    gatherDigitsTwiml({
      prompt: "Enter your callback PIN, then press pound.",
      actionPath: actionUrl,
    })
  );
}
