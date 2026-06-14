import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Recording playback proxy. The browser can't fetch a Twilio recording
 * directly (it needs account auth) and shouldn't see the raw provider URL.
 * This route checks the signed-in user can see the call (RLS), then streams
 * the audio with our creds. Twilio voicemails (M6) need Basic auth; AI-call
 * recordings (M7/Retell) are signed URLs we just pass through.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { callId } = await params;

  // User-scoped client: RLS only returns the call if the user is a
  // member of its tenant. No row, no recording.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: call } = await supabase
    .from("calls")
    .select("provider, recording_url")
    .eq("id", callId)
    .maybeSingle();
  if (!call?.recording_url) return new Response("Not found", { status: 404 });

  // Twilio recordings need our account auth; provider (Retell) recordings
  // are signed URLs fetched as-is.
  const isTwilio =
    call.provider === "twilio" || call.recording_url.includes("twilio.com");
  const headers: Record<string, string> = {};
  if (isTwilio) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      return new Response("Twilio not configured", { status: 503 });
    }
    headers.Authorization = `Basic ${Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
    ).toString("base64")}`;
  }
  const upstream = await fetch(call.recording_url, { headers });
  if (!upstream.ok || !upstream.body) {
    return new Response("Recording unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
