import type { SupabaseClient } from "@supabase/supabase-js";

import { runChatTurn } from "@/lib/chat/handle";
import { encryptText } from "@/lib/crypto";
import { redactPii } from "@/lib/redact";
import { isSuppressed, sendCustomerSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { messageTwiml, twimlResponse } from "@/lib/twilio/twiml";
import { forbidden, parseValidTwilioRequest } from "@/lib/twilio/webhook";

/**
 * Twilio inbound-SMS webhook (master plan Phase 7, §5.8 compliance).
 * Handles STOP/START/HELP against our tenant-wide suppression list, logs
 * every inbound message + reply, and routes by the receiving number.
 *
 * Note: Twilio "Advanced Opt-Out" on the Messaging Service must be OFF so
 * STOP reaches us and our suppression list is the source of truth.
 */
const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_WORDS = new Set(["START", "YES", "UNSTOP"]);
const HELP_WORDS = new Set(["HELP", "INFO"]);

const empty = () => twimlResponse("");

async function resolveBusinessName(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string | null
): Promise<string> {
  if (businessId) {
    const { data } = await admin
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle();
    if (data?.name) return data.name;
  }
  const { data } = await admin
    .from("businesses")
    .select("name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.name ?? "our team";
}

/** TwiML delivers the reply; we log it to messages for the record. */
async function logReply(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId: string | null;
    contactId: string | null;
    to: string;
    body: string;
    kind: "optout_ack" | "optin_ack" | "help";
  }
) {
  await admin.from("messages").insert({
    tenant_id: opts.tenantId,
    business_id: opts.businessId,
    contact_id: opts.contactId,
    direction: "outbound",
    to_number: opts.to,
    body_redacted: redactPii(opts.body).redacted,
    body_encrypted: encryptText(opts.body),
    status: "sent",
    kind: opts.kind,
    consent_checked: true,
  });
}

export async function POST(request: Request) {
  const params = await parseValidTwilioRequest(request);
  if (!params) return forbidden();

  const from = params.From ?? "";
  const to = params.To ?? "";
  const body = (params.Body ?? "").trim();
  const messageSid = params.MessageSid ?? params.SmsSid ?? "";
  if (!from || !to) return empty();

  const admin = createAdminClient();

  // Route to the tenant that owns the receiving number.
  const { data: number } = await admin
    .from("phone_numbers")
    .select("tenant_id, business_id")
    .eq("phone_number", to)
    .maybeSingle();
  if (!number) {
    console.warn(`[sms] inbound to unconfigured number ${to}`);
    return empty();
  }
  const tenantId = number.tenant_id as string;
  const businessId = (number.business_id as string | null) ?? null;

  // Idempotency — Twilio can retry an inbound delivery.
  if (messageSid) {
    const { data: existing } = await admin
      .from("messages")
      .select("id")
      .eq("provider_message_id", messageSid)
      .maybeSingle();
    if (existing) return empty();
  }

  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", from)
    .maybeSingle();
  const contactId = contact?.id ?? null;

  // Log the inbound message (triggers the contact's SMS timeline event).
  await admin.from("messages").insert({
    tenant_id: tenantId,
    business_id: businessId,
    contact_id: contactId,
    direction: "inbound",
    from_number: from,
    to_number: to,
    body_redacted: redactPii(body).redacted,
    body_encrypted: encryptText(body),
    status: "received",
    kind: "reply",
    consent_checked: false,
    provider_message_id: messageSid || null,
  });

  const keyword = body.split(/\s+/)[0]?.toUpperCase() ?? "";

  // ── STOP: suppress, drop consent, confirm ──
  if (STOP_WORDS.has(keyword)) {
    await admin
      .from("sms_suppressions")
      .upsert(
        { tenant_id: tenantId, phone: from, reason: "stop" },
        { onConflict: "tenant_id,phone", ignoreDuplicates: true }
      );
    if (contactId) {
      await admin
        .from("contacts")
        .update({
          consent_sms: false,
          consent_source: "sms_stop",
          consent_timestamp: new Date().toISOString(),
        })
        .eq("id", contactId)
        .eq("tenant_id", tenantId);
    }
    const businessName = await resolveBusinessName(admin, tenantId, businessId);
    const reply = `You're unsubscribed from ${businessName} and won't receive more texts. Reply START to resume.`;
    await logReply(admin, { tenantId, businessId, contactId, to: from, body: reply, kind: "optout_ack" });
    return twimlResponse(messageTwiml(reply));
  }

  // ── START: lift suppression, confirm ──
  if (START_WORDS.has(keyword)) {
    await admin
      .from("sms_suppressions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("phone", from);
    const businessName = await resolveBusinessName(admin, tenantId, businessId);
    const reply = `You're re-subscribed to ${businessName}. Reply STOP to opt out anytime.`;
    await logReply(admin, { tenantId, businessId, contactId, to: from, body: reply, kind: "optin_ack" });
    return twimlResponse(messageTwiml(reply));
  }

  // ── HELP ──
  if (HELP_WORDS.has(keyword)) {
    const businessName = await resolveBusinessName(admin, tenantId, businessId);
    const reply = `${businessName}: reply here and our team will help. Msg & data rates may apply. Reply STOP to opt out, START to resume.`;
    await logReply(admin, { tenantId, businessId, contactId, to: from, body: reply, kind: "help" });
    return twimlResponse(messageTwiml(reply));
  }

  // ── Two-way AI SMS (Phase 10, omnichannel_chat add-on) ──────────
  // A normal inbound (not a keyword) → let the AI reply, if the business
  // turned it on and is entitled. STOP suppression still hard-blocks: a
  // suppressed number gets logged but no AI engagement.
  let settingsQuery = admin
    .from("sms_settings")
    .select("two_way_sms_ai_enabled")
    .eq("tenant_id", tenantId);
  settingsQuery = businessId
    ? settingsQuery.eq("business_id", businessId)
    : settingsQuery.order("created_at", { ascending: true });
  const { data: chatSettings } = await settingsQuery.limit(1).maybeSingle();

  if (chatSettings?.two_way_sms_ai_enabled === true) {
    const suppressed = await isSuppressed(admin, tenantId, from);
    const result = await runChatTurn(admin, {
      tenantId,
      businessId,
      channel: "sms",
      customerPhone: from,
      text: body,
      skipAi: suppressed,
    });
    if (result.ok && result.reply) {
      // Sent through the gated sender so it's logged in `messages` and STOP
      // is honored (a reply to their own inbound is transactional).
      await sendCustomerSms(admin, {
        tenantId,
        businessId,
        contactId: result.conversation?.contact_id ?? null,
        toPhone: from,
        body: result.reply,
        kind: "reply",
        requireConsent: false,
      });
    }
  }

  return empty();
}
