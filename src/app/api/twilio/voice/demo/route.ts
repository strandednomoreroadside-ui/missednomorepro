import { timingSafeEqual } from "node:crypto";

import { currentZonedStrings } from "@/lib/calendar/timezone";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { dialSipTwiml, sayHangupTwiml, twimlResponse } from "@/lib/twilio/twiml";
import { getVoiceProvider } from "@/lib/voice";
import {
  AGENT_BUSINESS_COLUMNS,
  ensureAgentSynced,
  type AgentBusiness,
} from "@/lib/voice/agent-sync";

import { forbidden, parseValidTwilioRequest } from "../shared";

/**
 * Demo-call TwiML callback ("Test my AI"). Twilio fetches this when the
 * owner answers the outbound demo call placed by src/lib/voice/demo.ts. We
 * register the call with the owner's own Retell agent and bridge to it over
 * SIP — identical to the inbound AI path, but: the call is OUTBOUND, the
 * business is taken from the signed `b` query param (not the dialed number),
 * the bridge is hard-capped at a couple of minutes, and the row is flagged
 * disposition='demo' so finalize never treats it as a real lead.
 *
 * Auth: Twilio's request signature (covers the full URL incl. query string)
 * + the INTERNAL_API_SECRET echoed in `key`, re-checked here.
 */

/** Hard cap on the demo's talk time (cost guard). */
const DEMO_TIME_LIMIT_SECONDS = 180;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const BUSINESS_COLUMNS = AGENT_BUSINESS_COLUMNS;

const COULDNT_START =
  "Sorry, your test call could not be started right now. Please try again in a moment.";

export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const businessId = url.searchParams.get("b") ?? "";
  if (!env.INTERNAL_API_SECRET || !safeEqual(key, env.INTERNAL_API_SECRET)) {
    return forbidden();
  }
  if (!businessId) return twimlResponse(sayHangupTwiml(COULDNT_START));

  // From = the number we dialed out on; To = the owner's phone.
  const from = params.From ?? "";
  const to = params.To ?? "";
  const callSid = params.CallSid ?? "";

  const admin = createAdminClient();

  const { data: businessRow } = await admin
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("id", businessId)
    .maybeSingle();
  const business = (businessRow as AgentBusiness | null) ?? null;
  if (!business) return twimlResponse(sayHangupTwiml(COULDNT_START));

  if (!env.RETELL_API_KEY) return twimlResponse(sayHangupTwiml(COULDNT_START));

  try {
    const synced = await ensureAgentSynced(admin, business);
    // A disabled agent still has a usable provider ref — a demo is an
    // explicit owner-initiated test, so we run it regardless of the kill switch.
    if (!synced?.ref?.providerAgentId) {
      return twimlResponse(sayHangupTwiml(COULDNT_START));
    }

    const businessName = business.name || "your business";
    const localNow = currentZonedStrings(business.timezone || "America/New_York");
    const openingLine =
      `Hi! You've reached the A I receptionist for ${businessName}. ` +
      `This is a test call, so you're hearing exactly what your customers hear. ` +
      `Go ahead and ask me anything — like your services, hours, or a price.`;

    const reg = await getVoiceProvider().registerInboundCall({
      agent: synced.ref,
      tenantId: business.tenant_id,
      businessId: business.id,
      fromNumber: from,
      toNumber: to,
      twilioCallSid: callSid,
      metadata: { tenant_id: business.tenant_id, business_id: business.id, demo: "true" },
      dynamicVariables: {
        business_name: businessName,
        caller_phone: to,
        caller_name: "",
        is_returning: "false",
        sms_opted_out: "false",
        last_need: "",
        opening_line: openingLine,
        current_date: localNow.date,
        current_day: localNow.day,
        current_time: localNow.time,
      },
    });

    // Log the demo call. disposition='demo' + no contact => finalize skips the
    // staff lead-alert backstop and the CRM timeline; minutes still meter so
    // the cost caps apply. Idempotent on the provider call id.
    await admin.from("calls").upsert(
      {
        tenant_id: business.tenant_id,
        business_id: business.id,
        agent_id: synced.agentId,
        contact_id: null,
        provider: "retell",
        provider_call_id: reg.providerCallId,
        twilio_call_sid: callSid,
        direction: "outbound",
        from_number: from,
        to_number: to,
        status: "in-progress",
        disposition: "demo",
        ai_handled: true,
      },
      { onConflict: "provider_call_id", ignoreDuplicates: true }
    );

    if (reg.bridge.kind === "sip") {
      return twimlResponse(
        dialSipTwiml(reg.bridge.uri, { timeLimitSeconds: DEMO_TIME_LIMIT_SECONDS })
      );
    }
    console.warn(`[demo] unsupported bridge kind "${reg.bridge.kind}"`);
    return twimlResponse(sayHangupTwiml(COULDNT_START));
  } catch (err) {
    console.error("[demo] failed to bridge demo call:", err);
    return twimlResponse(sayHangupTwiml(COULDNT_START));
  }
}
