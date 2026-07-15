import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { bridgeCallTwiml, sayHangupTwiml, twimlResponse } from "@/lib/twilio/twiml";

import { forbidden, parseValidTwilioRequest } from "../shared";

/**
 * Click-to-call TwiML callback. src/app/dashboard/numbers/actions.ts#startOutboundCall
 * rings the STAFF member's own phone first; when they answer, Twilio fetches
 * this route, which bridges them to the TARGET number — presenting the
 * tenant's own business number as caller ID, so the customer sees a number
 * they recognize instead of a random staff cell. Used both by the operator
 * and by any future tenant (the "text/call from my business number" feature).
 *
 * Auth: Twilio's request signature (covers the full URL incl. query string)
 * + the INTERNAL_API_SECRET echoed in `key`, re-checked here — same pattern
 * as the demo-call route.
 */

/** Hard cap on the bridged leg (cost guard against a forgotten open line). */
const BRIDGE_TIME_LIMIT_SECONDS = 1800;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const COULDNT_CONNECT = "Sorry, we couldn't connect that call right now.";

export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const tenantId = url.searchParams.get("tid") ?? "";
  const target = url.searchParams.get("t") ?? "";
  const from = url.searchParams.get("f") ?? "";
  if (!env.INTERNAL_API_SECRET || !safeEqual(key, env.INTERNAL_API_SECRET)) {
    return forbidden();
  }
  if (!tenantId || !target || !from) {
    return twimlResponse(sayHangupTwiml(COULDNT_CONNECT));
  }

  const admin = createAdminClient();
  const callSid = params.CallSid ?? "";

  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", target)
    .maybeSingle();

  // Log it like any other call so it shows in Calls history. disposition
  // 'staff_call' (not an AI disposition) + ai_handled:false keeps finalize's
  // AI-specific logic (transcripts, the lead-alert backstop) from touching it.
  await admin.from("calls").upsert(
    {
      tenant_id: tenantId,
      contact_id: (contact?.id as string | undefined) ?? null,
      provider: "twilio",
      provider_call_id: callSid || `bridge_${Date.now()}`,
      direction: "outbound",
      from_number: from,
      to_number: target,
      status: "in-progress",
      disposition: "staff_call",
      ai_handled: false,
    },
    { onConflict: "provider_call_id", ignoreDuplicates: true }
  );

  return twimlResponse(
    bridgeCallTwiml(target, { callerId: from, timeLimitSeconds: BRIDGE_TIME_LIMIT_SECONDS })
  );
}
