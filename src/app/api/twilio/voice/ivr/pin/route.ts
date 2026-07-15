import { timingSafeEqual } from "node:crypto";

import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatherDigitsTwiml, sayHangupTwiml, twimlResponse } from "@/lib/twilio/twiml";

import { forbidden, parseValidTwilioRequest } from "../../shared";

/**
 * Callback IVR, step 2 of 2 (PIN check). src/lib/voice/callback-ivr.ts
 * already confirmed the caller ID matches a staff contact before this ever
 * runs — this is the second factor (a spoofed caller ID alone isn't enough).
 * On success, prompts for the number to dial (→ /ivr/dial). Failed PINs are
 * rate-limited via the audit log so guessing costs the attacker real
 * telephony time, not just retries.
 */

const WRONG_PIN_MESSAGE = "Incorrect PIN. Goodbye.";
const TOO_MANY_MESSAGE = "Too many attempts. Please try again later.";
const PIN_FAIL_AUDIT_ACTION = "callback_ivr.pin_failed";
const PIN_FAIL_DAILY_CAP = 5;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const tenantId = url.searchParams.get("tid") ?? "";
  const businessId = url.searchParams.get("bid") ?? "";
  if (!env.INTERNAL_API_SECRET || !safeEqual(key, env.INTERNAL_API_SECRET)) {
    return forbidden();
  }
  if (!tenantId || !businessId) return twimlResponse(sayHangupTwiml(WRONG_PIN_MESSAGE));

  const admin = createAdminClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("action", PIN_FAIL_AUDIT_ACTION)
    .gte("created_at", since);
  if ((count ?? 0) >= PIN_FAIL_DAILY_CAP) {
    return twimlResponse(sayHangupTwiml(TOO_MANY_MESSAGE));
  }

  const { data: settings } = await admin
    .from("sms_settings")
    .select("callback_ivr_pin")
    .eq("business_id", businessId)
    .maybeSingle();
  const pin = (settings?.callback_ivr_pin as string | null) ?? null;
  const entered = (params.Digits ?? "").trim();

  if (!pin || !entered || !safeEqual(entered, pin)) {
    await logAudit({
      tenantId,
      action: PIN_FAIL_AUDIT_ACTION,
      entityType: "call",
      entityId: params.CallSid,
    });
    return twimlResponse(sayHangupTwiml(WRONG_PIN_MESSAGE));
  }

  const actionUrl =
    `${appUrl()}/api/twilio/voice/ivr/dial` +
    `?tid=${encodeURIComponent(tenantId)}` +
    `&bid=${encodeURIComponent(businessId)}` +
    `&key=${encodeURIComponent(env.INTERNAL_API_SECRET)}`;

  return twimlResponse(
    gatherDigitsTwiml({
      prompt: "Enter the number you'd like to call, then press pound.",
      actionPath: actionUrl,
      timeoutSeconds: 15,
    })
  );
}
