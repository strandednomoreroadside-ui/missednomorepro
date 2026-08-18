import { createAdminClient } from "@/lib/supabase/admin";

import { forbidden, parseValidTwilioRequest } from "../shared";

/**
 * recordingStatusCallback — async delivery of the final voicemail
 * recording URL (voicemail-to-log per BUILD_GUIDE M6).
 */
export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const callSid = params.CallSid ?? "";
  const recordingUrl = params.RecordingUrl ?? "";
  if (callSid && recordingUrl) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("calls")
      .update({
        // .mp3 lets the playback proxy stream it directly.
        recording_url: `${recordingUrl}.mp3`,
        status: "voicemail",
      })
      .or(`provider_call_id.eq.${callSid},twilio_call_sid.eq.${callSid}`);
    if (error) console.error("[twilio] recording url save failed:", error.message);
  }

  return new Response("ok");
}
