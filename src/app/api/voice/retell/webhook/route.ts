import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVoiceProvider } from "@/lib/voice";
import { applyCallAnalysis, applyCallEnded } from "@/lib/voice/finalize";

/**
 * Retell call-lifecycle webhook (BUILD_GUIDE M7 step 5/6). Receives
 * call_started / call_ended / call_analyzed and finalizes our call record
 * (transcript, summary, disposition, metering, timeline).
 *
 * Auth: the INTERNAL_API_SECRET carried in the webhook URL (Retell ships
 * no signed-webhook verifier in this SDK version). Handlers are idempotent
 * — Retell retries and call_ended/call_analyzed overlap — so we always ack
 * 200 once authenticated and let the finalize helpers de-dupe.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const key =
    url.searchParams.get("key") ?? request.headers.get("x-internal-secret") ?? "";
  if (!env.INTERNAL_API_SECRET || !safeEqual(key, env.INTERNAL_API_SECRET)) {
    return new Response("unauthorized", { status: 401 });
  }

  const raw = await request.text();
  const provider = getVoiceProvider();
  if (!provider.verifyWebhook(raw, request.headers.get("x-retell-signature"))) {
    return new Response("bad signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const event = provider.parseWebhookEvent(payload);
  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "call_started":
        await admin
          .from("calls")
          .update({ status: "in-progress" })
          .eq("provider_call_id", event.providerCallId)
          .is("ended_at", null);
        break;
      case "call_ended":
        await applyCallEnded(admin, event.providerCallId, {
          durationSeconds: event.durationSeconds,
          recordingUrl: event.recordingUrl,
        });
        break;
      case "call_analyzed":
        await applyCallAnalysis(admin, event.providerCallId, event.analysis);
        break;
      case "ignored":
        console.info(`[retell webhook] ignored: ${event.reason}`);
        break;
    }
  } catch (err) {
    // Logged, but still ack — the handlers are idempotent and a 500 would
    // just trigger Retell to replay the same event.
    console.error("[retell webhook] handler error:", err);
  }

  return new Response("ok", { status: 200 });
}
