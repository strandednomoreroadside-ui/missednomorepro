import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Voicemail playback proxy. Twilio recordings require account auth, so
 * the browser can't fetch them directly. This route checks the signed-in
 * user can see the call (RLS), then streams the audio with our creds —
 * the Twilio URL and credentials never reach the client.
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
    .select("recording_url")
    .eq("id", callId)
    .maybeSingle();
  if (!call?.recording_url) return new Response("Not found", { status: 404 });

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return new Response("Twilio not configured", { status: 503 });
  }

  const auth = Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");
  const upstream = await fetch(call.recording_url, {
    headers: { Authorization: `Basic ${auth}` },
  });
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
