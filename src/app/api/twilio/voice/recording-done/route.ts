import { createAdminClient } from "@/lib/supabase/admin";
import { twimlResponse, voicemailThanksTwiml } from "@/lib/twilio/twiml";

import { forbidden, parseValidTwilioRequest } from "../shared";

/**
 * <Record action> target — Twilio sends the caller here when the
 * voicemail recording finishes (or they hang up mid-message).
 */
export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const callSid = params.CallSid ?? "";
  const recordingSeconds = Number.parseInt(params.RecordingDuration ?? "0", 10);

  if (callSid && recordingSeconds > 0) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("calls")
      .update({ status: "voicemail" })
      .or(`provider_call_id.eq.${callSid},twilio_call_sid.eq.${callSid}`);
    if (error) console.error("[twilio] voicemail status update failed:", error.message);
  }

  return twimlResponse(voicemailThanksTwiml());
}
