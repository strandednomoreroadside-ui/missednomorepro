import { voiceAllowed } from "@/lib/billing/cost-controls";
import { currentZonedStrings } from "@/lib/calendar/timezone";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  dialNumberTwiml,
  dialSipTwiml,
  greetingTwiml,
  twimlResponse,
  unconfiguredTwiml,
} from "@/lib/twilio/twiml";
import { getVoiceProvider } from "@/lib/voice";
import { ensureAgentSynced, type AgentBusiness } from "@/lib/voice/agent-sync";

import { forbidden, parseValidTwilioRequest } from "./shared";

/** The business shape this route needs — AgentBusiness + the M10 kill
 *  switch / forward fields. */
type VoiceBusiness = AgentBusiness & {
  ai_enabled: boolean;
  forward_number: string | null;
};

const BUSINESS_COLUMNS =
  "id, tenant_id, name, industry, timezone, status, ai_enabled, forward_number";

/** Where to ring when the AI is paused or a cost cap trips: the owner's
 *  configured forward number, else the first notify-on-lead staff phone. */
async function resolveForwardNumber(
  admin: ReturnType<typeof createAdminClient>,
  business: VoiceBusiness
): Promise<string | null> {
  if (business.forward_number) return business.forward_number;
  const { data } = await admin
    .from("staff_contacts")
    .select("phone")
    .eq("business_id", business.id)
    .eq("notify_on_lead", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { phone?: string } | null)?.phone ?? null;
}

/**
 * Twilio inbound-voice webhook. The entry point for every call (master
 * plan Ticket 29, §8.2).
 *
 * M7: when the dialed number's business is LIVE and its AI is on, we
 * register the call with the voice provider and bridge the caller to it
 * (the AI receptionist answers). Otherwise — not live, AI disabled, or any
 * setup error — we fall back to the M6 branded greeting + voicemail so a
 * call is never dropped. Our webhook stays the entry point either way, so
 * the provider stays swappable (§3.1).
 */
export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const to = params.To ?? "";
  const from = params.From ?? "";
  const callSid = params.CallSid ?? "";
  if (!to || !callSid) return twimlResponse(unconfiguredTwiml());

  const admin = createAdminClient();

  // Which tenant owns the dialed number?
  const { data: number } = await admin
    .from("phone_numbers")
    .select("tenant_id, business_id, voice_enabled")
    .eq("phone_number", to)
    .maybeSingle();
  if (!number || !number.voice_enabled) {
    console.warn(`[twilio] call to unconfigured number ${to}`);
    return twimlResponse(unconfiguredTwiml());
  }

  // Resolve the business (the dialed number's, else the tenant's first).
  let business: VoiceBusiness | null = null;
  if (number.business_id) {
    const { data } = await admin
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .eq("id", number.business_id)
      .maybeSingle();
    business = (data as VoiceBusiness | null) ?? null;
  }
  if (!business) {
    const { data } = await admin
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .eq("tenant_id", number.tenant_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    business = (data as VoiceBusiness | null) ?? null;
  }
  const businessName = business?.name ?? "our team";

  // Known caller? (M5 keeps phone unique per tenant for exactly this.)
  const { data: contact } = await admin
    .from("contacts")
    .select("id, name")
    .eq("tenant_id", number.tenant_id)
    .eq("phone", from)
    .maybeSingle();

  // ── Kill switch + cost caps (§14/§15): forward to the owner ───
  // Owner/admin turned the AI off, or a usage/spend cap tripped → ring the
  // owner's phone instead of the AI (no surprise bill, call still answered).
  if (business) {
    let blockReason: string | null = null;
    if (business.ai_enabled === false) {
      blockReason = "ai_disabled";
    } else if (business.status === "live") {
      const gate = await voiceAllowed(admin, business.tenant_id);
      if (!gate.allowed) blockReason = gate.reason;
    }
    if (blockReason) {
      const forwardTo = await resolveForwardNumber(admin, business);
      if (forwardTo) {
        const disposition = blockReason === "ai_disabled" ? "forwarded" : "capped";
        await admin.from("calls").upsert(
          {
            tenant_id: business.tenant_id,
            business_id: business.id,
            contact_id: contact?.id ?? null,
            provider: "twilio",
            provider_call_id: callSid,
            twilio_call_sid: callSid,
            direction: "inbound",
            from_number: from,
            to_number: to,
            status: "in-progress",
            disposition,
            ai_handled: false,
          },
          { onConflict: "provider_call_id", ignoreDuplicates: true }
        );
        console.info(`[twilio] forwarding to owner (${blockReason}) for ${to}`);
        return twimlResponse(dialNumberTwiml(forwardTo));
      }
      // No number to forward to — fall through to the voicemail greeting.
      console.warn(`[twilio] ${blockReason} but no forward number for ${to}`);
    }
  }

  // ── AI path: live business + configured provider ──────────────
  if (
    business &&
    business.status === "live" &&
    env.RETELL_API_KEY &&
    env.INTERNAL_API_SECRET
  ) {
    try {
      const synced = await ensureAgentSynced(admin, business);
      if (synced && !synced.disabled) {
        // Returning-caller opening: greet by name + reference their last need,
        // so recognition happens in the AI's very first sentence.
        let lastNeed = "";
        if (contact) {
          const { data: lead } = await admin
            .from("leads")
            .select("service_needed")
            .eq("tenant_id", business.tenant_id)
            .eq("contact_id", contact.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          lastNeed = lead?.service_needed ?? "";
        }
        const firstName = (contact?.name ?? "").trim().split(" ")[0] ?? "";
        const openingLine = contact
          ? `Welcome back${firstName ? ", " + firstName : ""}! Thanks for calling ${businessName}.` +
            (lastNeed
              ? ` Are you calling about your ${lastNeed.slice(0, 80)}, or is it something new today?`
              : " How can I help you today?")
          : `Thanks for calling ${businessName}. You've reached our virtual assistant — how can I help you today?`;

        const localNow = currentZonedStrings(business.timezone || "America/New_York");

        const reg = await getVoiceProvider().registerInboundCall({
          agent: synced.ref,
          tenantId: business.tenant_id,
          businessId: business.id,
          fromNumber: from,
          toNumber: to,
          twilioCallSid: callSid,
          metadata: { tenant_id: business.tenant_id, business_id: business.id },
          dynamicVariables: {
            business_name: businessName,
            caller_phone: from,
            caller_name: contact?.name ?? "",
            is_returning: contact ? "true" : "false",
            last_need: lastNeed,
            opening_line: openingLine,
            // Booking date context (business-local) so the AI can resolve
            // "tomorrow"/"next Tuesday" to a concrete date.
            current_date: localNow.date,
            current_day: localNow.day,
            current_time: localNow.time,
          },
        });

        // Log the AI call (idempotent on the provider's call id).
        await admin.from("calls").upsert(
          {
            tenant_id: business.tenant_id,
            business_id: business.id,
            agent_id: synced.agentId,
            contact_id: contact?.id ?? null,
            provider: "retell",
            provider_call_id: reg.providerCallId,
            twilio_call_sid: callSid,
            direction: "inbound",
            from_number: from,
            to_number: to,
            status: "in-progress",
            ai_handled: true,
          },
          { onConflict: "provider_call_id", ignoreDuplicates: true }
        );

        if (reg.bridge.kind === "sip") {
          return twimlResponse(dialSipTwiml(reg.bridge.uri));
        }
        console.warn(`[twilio] unsupported bridge kind "${reg.bridge.kind}" — greeting`);
      }
    } catch (err) {
      // A provisioning/registration hiccup must never drop the call.
      console.error("[twilio] AI path failed, falling back to greeting:", err);
    }
  }

  // ── Fallback: M6 branded greeting + voicemail-to-log ──────────
  const { error: callErr } = await admin.from("calls").upsert(
    {
      tenant_id: number.tenant_id,
      business_id: business?.id ?? null,
      contact_id: contact?.id ?? null,
      provider: "twilio",
      provider_call_id: callSid,
      twilio_call_sid: callSid,
      direction: "inbound",
      from_number: from,
      to_number: to,
      status: "in-progress",
    },
    { onConflict: "provider_call_id", ignoreDuplicates: true }
  );
  if (callErr) console.error("[twilio] failed to log call:", callErr.message);

  return twimlResponse(
    greetingTwiml({
      businessName,
      recordDonePath: "/api/twilio/voice/recording-done",
      recordingStatusPath: "/api/twilio/voice/recording",
    })
  );
}
