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

/** Log a 'queued' row, send via Twilio, then update status + Sid. */
async function logAndSend(admin: SupabaseClient, row: MessageRow): Promise<SmsSendResult> {
  const id = await insertMessage(admin, row, "queued", null);
  const res = await sendTwilioSms({ to: row.toPhone, body: row.body });
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
