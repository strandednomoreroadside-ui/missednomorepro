import { createAdminClient } from "@/lib/supabase/admin";

import { forbidden, parseValidTwilioRequest } from "../shared";

/** Twilio call statuses → our call statuses (voicemail wins if set). */
const STATUS_MAP: Record<string, string> = {
  completed: "completed",
  busy: "missed",
  "no-answer": "missed",
  failed: "failed",
  canceled: "missed",
};

/**
 * statusCallback — fires when the call ends. Records duration and
 * final status, and writes the call onto the caller's CRM timeline.
 */
export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const callSid = params.CallSid ?? "";
  const twilioStatus = params.CallStatus ?? "";
  const mapped = STATUS_MAP[twilioStatus];
  if (!callSid || !mapped) return new Response("ok");

  const admin = createAdminClient();
  const { data: call } = await admin
    .from("calls")
    .select("id, tenant_id, contact_id, status, from_number")
    .eq("provider_call_id", callSid)
    .maybeSingle();
  if (!call) return new Response("ok");

  const duration = Number.parseInt(params.CallDuration ?? "0", 10) || null;
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

  // Known caller → the call joins their tamper-proof timeline (M5).
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

  return new Response("ok");
}
