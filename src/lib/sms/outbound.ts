import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { encryptText } from "@/lib/crypto";
import { normalizeUsPhone } from "@/lib/phone";
import { redactPii } from "@/lib/redact";
import { sendTwilioSms } from "@/lib/twilio/sms";

/**
 * The outbound SMS chokepoint (master plan Phase 7, §5.8, §9). Every
 * customer text passes the compliance gate here:
 *
 *   1. STOP list (sms_suppressions) — hard block, ALWAYS, overrides any
 *      per-contact consent. This is the legal backstop.
 *   2. Consent — required for non-transactional sends. Transactional
 *      messages (a text-back replying to the caller's own call, a booking
 *      confirmation they asked for) set requireConsent:false but STILL
 *      respect the STOP list.
 *
 * Every attempt — sent, blocked, failed — is logged to `messages` with an
 * encrypted body + redacted display copy. Staff alerts skip the gate
 * (internal recipients) but are still logged.
 */

export type SmsKind =
  | "text_back"
  | "staff_alert"
  | "confirmation"
  | "reminder"
  | "followup"
  | "review"
  | "payment"
  | "reply"
  | "help"
  | "optout_ack"
  | "optin_ack"
  | "manual"
  | "campaign";

export interface SmsSendResult {
  sent: boolean;
  blocked: boolean;
  reason?: string;
  /** Our messages.id, when a row was written. */
  messageId?: string;
}

interface MessageRow {
  tenantId: string;
  businessId?: string | null;
  contactId?: string | null;
  toPhone: string;
  body: string;
  kind: SmsKind;
  consentChecked: boolean;
}

/**
 * The number a given tenant should text FROM: its own SMS-enabled line
 * (preferring the one attached to this business), so every business texts
 * from its own number. Returns null when the tenant has no number yet — the
 * transport then falls back to the shared Messaging Service so a not-yet-
 * provisioned tenant's staff alerts still go out.
 */
async function resolveTenantFrom(
  admin: SupabaseClient,
  tenantId: string,
  businessId?: string | null
): Promise<string | null> {
  const { data } = await admin
    .from("phone_numbers")
    .select("phone_number, business_id")
    .eq("tenant_id", tenantId)
    .eq("sms_enabled", true)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as { phone_number: string; business_id: string | null }[];
  if (rows.length === 0) return null;
  // Prefer the number attached to this business; else the tenant's first.
  const match = businessId ? rows.find((r) => r.business_id === businessId) : undefined;
  return (match ?? rows[0]).phone_number;
}

export async function isSuppressed(
  admin: SupabaseClient,
  tenantId: string,
  phone: string
): Promise<boolean> {
  const { data } = await admin
    .from("sms_suppressions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .maybeSingle();
  return Boolean(data);
}

async function insertMessage(
  admin: SupabaseClient,
  row: MessageRow,
  status: string,
  error: string | null
): Promise<string | null> {
  const { data, error: insErr } = await admin
    .from("messages")
    .insert({
      tenant_id: row.tenantId,
      business_id: row.businessId ?? null,
      contact_id: row.contactId ?? null,
      direction: "outbound",
      to_number: row.toPhone,
      body_redacted: redactPii(row.body).redacted,
      body_encrypted: encryptText(row.body),
      status,
      kind: row.kind,
      consent_checked: row.consentChecked,
      error,
    })
    .select("id")
    .single();
  if (insErr) {
    console.error("[sms] failed to log message:", insErr.message);
    return null;
  }
  return data.id;
}

/**
 * Twilio error codes that mean the recipient has opted out at the
 * carrier/Twilio level (a STOP that never reached our webhook — e.g. the
 * Messaging Service's Advanced Opt-Out is on, or they opted out before we
 * ever tracked them). When we see one we self-heal: record the number on our
 * own suppression list + drop consent so we never attempt it again. Repeated
 * blocked sends are what hurt account standing, so this is the real fix.
 *   21610 — recipient unsubscribed (replied STOP)
 *   21211 — invalid 'To' (kept out; not opt-out)
 */
const OPT_OUT_CODES = new Set([21610]);

async function recordCarrierOptOut(
  admin: SupabaseClient,
  tenantId: string,
  phone: string
): Promise<void> {
  await admin
    .from("sms_suppressions")
    .upsert(
      { tenant_id: tenantId, phone, reason: "stop" },
      { onConflict: "tenant_id,phone", ignoreDuplicates: true }
    );
  await admin
    .from("contacts")
    .update({
      consent_sms: false,
      consent_source: "carrier_stop",
      consent_timestamp: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("phone", phone);
}

/** Log a 'queued' row, send via Twilio, then update status + Sid. */
async function logAndSend(admin: SupabaseClient, row: MessageRow): Promise<SmsSendResult> {
  const id = await insertMessage(admin, row, "queued", null);
  const from = await resolveTenantFrom(admin, row.tenantId, row.businessId);
  const res = await sendTwilioSms({ to: row.toPhone, body: row.body, from });

  // Carrier-level opt-out: suppress locally so this never happens twice.
  if (!res.ok && res.code != null && OPT_OUT_CODES.has(res.code)) {
    await recordCarrierOptOut(admin, row.tenantId, row.toPhone);
    if (id) {
      await admin
        .from("messages")
        .update({ status: "blocked", error: `opted_out (${res.code})` })
        .eq("id", id);
    }
    return { sent: false, blocked: true, reason: "suppressed_carrier", messageId: id ?? undefined };
  }

  if (id) {
    await admin
      .from("messages")
      .update({
        status: res.ok ? "sent" : "failed",
        provider_message_id: res.sid,
        error: res.error,
      })
      .eq("id", id);
  }
  return {
    sent: res.ok,
    blocked: false,
    reason: res.ok ? undefined : res.error ?? "twilio_error",
    messageId: id ?? undefined,
  };
}

async function logBlocked(
  admin: SupabaseClient,
  row: MessageRow,
  reason: string
): Promise<SmsSendResult> {
  const id = await insertMessage(admin, { ...row, consentChecked: true }, "blocked", reason);
  return { sent: false, blocked: true, reason, messageId: id ?? undefined };
}

/**
 * Staff alert — internal recipient, no consent/suppression gate, but
 * logged like any other message (so "every message is logged" holds).
 */
export async function sendStaffSms(
  admin: SupabaseClient,
  opts: { tenantId: string; businessId?: string | null; toPhone: string; body: string }
): Promise<SmsSendResult> {
  const to = normalizeUsPhone(opts.toPhone) ?? opts.toPhone;
  return logAndSend(admin, {
    tenantId: opts.tenantId,
    businessId: opts.businessId,
    contactId: null,
    toPhone: to,
    body: opts.body,
    kind: "staff_alert",
    consentChecked: false,
  });
}

/**
 * Customer SMS — runs the full compliance gate. `requireConsent` defaults
 * to true; pass false only for transactional messages (text-back,
 * confirmations the caller initiated). STOP always wins.
 */
export async function sendCustomerSms(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId?: string | null;
    contactId?: string | null;
    toPhone: string;
    body: string;
    kind: SmsKind;
    requireConsent?: boolean;
  }
): Promise<SmsSendResult> {
  const to = normalizeUsPhone(opts.toPhone);
  const base: MessageRow = {
    tenantId: opts.tenantId,
    businessId: opts.businessId,
    contactId: opts.contactId,
    toPhone: to ?? opts.toPhone,
    body: opts.body,
    kind: opts.kind,
    consentChecked: true,
  };
  if (!to) return logBlocked(admin, base, "invalid_number");

  // 1. STOP list — hard block, always.
  if (await isSuppressed(admin, opts.tenantId, to)) {
    return logBlocked(admin, base, "suppressed");
  }

  // 2. Consent for non-transactional messages.
  if (opts.requireConsent ?? true) {
    let consent = false;
    if (opts.contactId) {
      const { data } = await admin
        .from("contacts")
        .select("consent_sms")
        .eq("id", opts.contactId)
        .eq("tenant_id", opts.tenantId)
        .maybeSingle();
      consent = Boolean(data?.consent_sms);
    } else {
      const { data } = await admin
        .from("contacts")
        .select("consent_sms")
        .eq("tenant_id", opts.tenantId)
        .eq("phone", to)
        .maybeSingle();
      consent = Boolean(data?.consent_sms);
    }
    if (!consent) return logBlocked(admin, base, "no_consent");
  }

  return logAndSend(admin, base);
}
