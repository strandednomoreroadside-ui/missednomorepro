import { createAdminClient } from "@/lib/supabase/admin";
import { greetingTwiml, twimlResponse, unconfiguredTwiml } from "@/lib/twilio/twiml";

import { forbidden, parseValidTwilioRequest } from "./shared";

/**
 * Twilio inbound-voice webhook (master plan Ticket 29, BUILD_GUIDE M6).
 * Answers with the branded placeholder greeting + voicemail, and logs
 * the call. The AI takes over this route at M7.
 */
export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const to = params.To ?? "";
  const from = params.From ?? "";
  const callSid = params.CallSid ?? "";
  if (!to || !callSid) return twimlResponse(unconfiguredTwiml());

  const admin = createAdminClient();

  // Route the call: which tenant owns the dialed number?
  const { data: number } = await admin
    .from("phone_numbers")
    .select("tenant_id, business_id, voice_enabled")
    .eq("phone_number", to)
    .maybeSingle();
  if (!number || !number.voice_enabled) {
    console.warn(`[twilio] call to unconfigured number ${to}`);
    return twimlResponse(unconfiguredTwiml());
  }

  // Greet with the business name (fall back to the org name).
  let businessName: string | null = null;
  if (number.business_id) {
    const { data: biz } = await admin
      .from("businesses")
      .select("name")
      .eq("id", number.business_id)
      .maybeSingle();
    businessName = biz?.name ?? null;
  }
  if (!businessName) {
    const { data: biz } = await admin
      .from("businesses")
      .select("name")
      .eq("tenant_id", number.tenant_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    businessName = biz?.name ?? null;
  }
  if (!businessName) {
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", number.tenant_id)
      .maybeSingle();
    businessName = org?.name ?? "our team";
  }

  // Known caller? (M5 keeps phone unique per tenant for exactly this.)
  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", number.tenant_id)
    .eq("phone", from)
    .maybeSingle();

  // Log the call. Webhook retries are idempotent via the unique CallSid.
  const { error: callErr } = await admin.from("calls").upsert(
    {
      tenant_id: number.tenant_id,
      contact_id: contact?.id ?? null,
      provider: "twilio",
      provider_call_id: callSid,
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
      businessName: businessName ?? "our team",
      recordDonePath: "/api/twilio/voice/recording-done",
      recordingStatusPath: "/api/twilio/voice/recording",
    })
  );
}
