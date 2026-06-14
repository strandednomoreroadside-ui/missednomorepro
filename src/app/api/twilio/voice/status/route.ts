import { createAdminClient } from "@/lib/supabase/admin";
import { maybeSendTextBack } from "@/lib/sms/textback";

import { forbidden, parseValidTwilioRequest } from "../shared";

/** Twilio call statuses → our call statuses (voicemail wins if set). */
const STATUS_MAP: Record<string, string> = {
  completed: "completed",
  busy: "missed",
  "no-answer": "missed",
  failed: "failed",
  canceled: "missed",
};

/** Dispositions that mean the caller was actually helped (no text-back). */
const ENGAGED_DISPOSITIONS = ["lead", "spam", "escalated", "out_of_area", "booked"];

const COLUMNS =
  "id, tenant_id, business_id, contact_id, disposition, status, from_number, provider, ai_handled";

/**
 * statusCallback — fires when an inbound call ends. For M6 fallback calls
 * it records duration + final status + a CRM timeline entry. For M7 AI
 * calls the Retell webhook owns finalization, so we DON'T touch the row
 * here. Either way, if the caller hung up without being helped, we fire
 * the missed-call text-back (M8, the namesake feature).
 */
export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const callSid = params.CallSid ?? "";
  const twilioStatus = params.CallStatus ?? "";
  const mapped = STATUS_MAP[twilioStatus];
  if (!callSid || !mapped) return new Response("ok");

  const admin = createAdminClient();

  // New calls set twilio_call_sid in both the AI and fallback paths; older
  // M6 rows used the CallSid as provider_call_id.
  let { data: call } = await admin
    .from("calls")
    .select(COLUMNS)
    .eq("twilio_call_sid", callSid)
    .maybeSingle();
  if (!call) {
    ({ data: call } = await admin
      .from("calls")
      .select(COLUMNS)
      .eq("provider_call_id", callSid)
      .maybeSingle());
  }
  if (!call) return new Response("ok");

  const duration = Number.parseInt(params.CallDuration ?? "0", 10) || null;
  const isAiCall = call.provider === "retell" || call.ai_handled;
  const engaged =
    Boolean(call.contact_id) ||
    ENGAGED_DISPOSITIONS.includes(call.disposition ?? "");

  // M6 fallback calls: close out status + timeline here (no Retell webhook).
  if (!isAiCall) {
    const finalStatus = call.status === "voicemail" ? "voicemail" : mapped;
    const { error } = await admin
      .from("calls")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        status: finalStatus,
      })
      .eq("id", call.id);
    if (error) console.error("[twilio] call close-out failed:", error.message);

    if (call.contact_id) {
      const mins = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : "brief";
      const summary =
        finalStatus === "voicemail"
          ? `Inbound call (${mins}) — left a voicemail`
          : `Inbound call (${mins}) — ${finalStatus}`;
      const { error: tlErr } = await admin.from("customer_timeline_events").insert({
        tenant_id: call.tenant_id,
        contact_id: call.contact_id,
        event_type: "call",
        source_id: call.id,
        summary,
      });
      if (tlErr) console.error("[twilio] timeline write failed:", tlErr.message);
    }
  }

  // Missed-call text-back: the caller hung up without being helped.
  const missed = mapped === "missed" || (mapped === "completed" && (duration ?? 0) < 20);
  if (missed && !engaged) {
    await maybeSendTextBack(admin, {
      tenant_id: call.tenant_id,
      business_id: call.business_id,
      contact_id: call.contact_id,
      from_number: call.from_number,
    });
  }

  return new Response("ok");
}
