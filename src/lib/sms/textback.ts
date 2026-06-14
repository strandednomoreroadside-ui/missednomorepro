import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendCustomerSms } from "./outbound";

const DEFAULT_TEMPLATE =
  "Hi! Thanks for calling {business}. Sorry we missed you — text us back here and we'll help right away. Reply STOP to opt out.";

/**
 * Missed-call text-back — the product's namesake feature. Fires when a
 * caller hangs up before/during the AI without being helped. Honors the
 * per-business toggle + template, dedupes one text-back per caller per
 * 30 minutes, and routes through sendCustomerSms (so STOP still wins and
 * it's logged). Transactional (they just called us) → requireConsent
 * false, but a suppressed number is still never texted.
 */
export async function maybeSendTextBack(
  admin: SupabaseClient,
  call: {
    tenant_id: string;
    business_id: string | null;
    contact_id: string | null;
    from_number: string | null;
  }
): Promise<void> {
  const from = call.from_number;
  if (!from) return;

  let enabled = true;
  let template = DEFAULT_TEMPLATE;
  if (call.business_id) {
    const { data } = await admin
      .from("sms_settings")
      .select("text_back_enabled, text_back_template")
      .eq("business_id", call.business_id)
      .maybeSingle();
    if (data) {
      enabled = data.text_back_enabled;
      template = data.text_back_template || DEFAULT_TEMPLATE;
    }
  }
  if (!enabled) return;

  // Dedupe: one text-back per caller per 30 minutes.
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("messages")
    .select("id")
    .eq("tenant_id", call.tenant_id)
    .eq("kind", "text_back")
    .eq("to_number", from)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (recent) return;

  let businessName = "us";
  if (call.business_id) {
    const { data } = await admin
      .from("businesses")
      .select("name")
      .eq("id", call.business_id)
      .maybeSingle();
    if (data?.name) businessName = data.name;
  } else {
    const { data } = await admin
      .from("businesses")
      .select("name")
      .eq("tenant_id", call.tenant_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data?.name) businessName = data.name;
  }

  const body = template.replace(/\{business\}/g, businessName);
  await sendCustomerSms(admin, {
    tenantId: call.tenant_id,
    businessId: call.business_id,
    contactId: call.contact_id,
    toPhone: from,
    body,
    kind: "text_back",
    requireConsent: false,
  });
}
