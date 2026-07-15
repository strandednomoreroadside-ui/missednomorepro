import { timingSafeEqual } from "node:crypto";

import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { bridgeCallTwiml, sayHangupTwiml, twimlResponse } from "@/lib/twilio/twiml";

import { forbidden, parseValidTwilioRequest } from "../../shared";

/**
 * Callback IVR, final step: the caller has already cleared the caller-ID
 * check + PIN (src/lib/voice/callback-ivr.ts, /ivr/pin). Dial the number
 * they entered, presenting the business's own Twilio number (params.To —
 * the number they called to get here) as caller ID. Shares the same
 * "staff_call.placed" audit action + daily cap as the web click-to-call
 * feature (src/app/dashboard/numbers/actions.ts#startOutboundCall) so both
 * paths count against one limit.
 */

const BRIDGE_TIME_LIMIT_SECONDS = 1800;
const DAILY_CAP = 100;
const AUDIT_ACTION = "staff_call.placed";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const COULDNT_CONNECT = "Sorry, we couldn't place that call. Goodbye.";

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

  const from = params.To ?? ""; // the business number the staff member called
  const target = normalizeUsPhone(params.Digits ?? "");
  const callSid = params.CallSid ?? "";
  if (!tenantId || !businessId || !from || !target) {
    return twimlResponse(sayHangupTwiml(COULDNT_CONNECT));
  }

  const admin = createAdminClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("action", AUDIT_ACTION)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_CAP) {
    return twimlResponse(sayHangupTwiml("Daily call limit reached. Goodbye."));
  }

  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", target)
    .maybeSingle();

  await admin.from("calls").upsert(
    {
      tenant_id: tenantId,
      business_id: businessId,
      contact_id: (contact?.id as string | undefined) ?? null,
      provider: "twilio",
      provider_call_id: callSid || `ivr_${Date.now()}`,
      direction: "outbound",
      from_number: from,
      to_number: target,
      status: "in-progress",
      disposition: "staff_call",
      ai_handled: false,
    },
    { onConflict: "provider_call_id", ignoreDuplicates: true }
  );

  await logAudit({
    tenantId,
    action: AUDIT_ACTION,
    entityType: "call",
    entityId: callSid,
    metadata: { target, from, via: "callback_ivr" },
  });

  return twimlResponse(
    bridgeCallTwiml(target, { callerId: from, timeLimitSeconds: BRIDGE_TIME_LIMIT_SECONDS })
  );
}
