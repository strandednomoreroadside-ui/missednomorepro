import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatSlotLabel } from "@/lib/calendar/timezone";
import { sendCustomerSms } from "./outbound";

/**
 * Appointment reminders (roadmap #3). Driven by a daily Vercel Cron
 * (/api/cron/reminders). Finds confirmed, not-yet-reminded appointments
 * coming up within each business's reminder lead time and texts the
 * customer once.
 *
 * Margin discipline: ONE reminder per appointment. We stamp
 * appointments.reminder_sent_at after a send or a terminal skip
 * (suppressed / no number), so the cron never texts — or charges us for —
 * the same appointment twice. Only a transient Twilio failure leaves the
 * stamp null so the next run retries.
 */

const DEFAULT_TEMPLATE =
  "Reminder: your appointment with {business} is {time}. Need to change it? Just call us back. Reply STOP to opt out.";

// How far ahead to scan each run. Must be >= the largest reminder lead
// (capped at 168h by the schema); 8 days bounds the query for the daily run.
const HORIZON_HOURS = 8 * 24;

type ApptRow = {
  id: string;
  tenant_id: string;
  business_id: string;
  contact_id: string | null;
  title: string;
  starts_at: string;
};

type BizBundle = {
  name: string;
  timezone: string;
  enabled: boolean;
  leadHours: number;
  template: string;
};

export interface ReminderRunResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Cache business + sms_settings lookups within a single run. */
async function loadBizBundle(
  admin: SupabaseClient,
  businessId: string,
  cache: Map<string, BizBundle | null>
): Promise<BizBundle | null> {
  if (cache.has(businessId)) return cache.get(businessId) ?? null;

  const [{ data: biz }, { data: sms }] = await Promise.all([
    admin.from("businesses").select("name, timezone").eq("id", businessId).maybeSingle(),
    admin
      .from("sms_settings")
      .select("reminder_enabled, reminder_lead_hours, reminder_template")
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  if (!biz) {
    cache.set(businessId, null);
    return null;
  }
  const bundle: BizBundle = {
    name: (biz.name as string) || "us",
    timezone: (biz.timezone as string) || "America/New_York",
    enabled: sms ? Boolean(sms.reminder_enabled) : true,
    leadHours: sms?.reminder_lead_hours ? Number(sms.reminder_lead_hours) : 24,
    template: (sms?.reminder_template as string) || DEFAULT_TEMPLATE,
  };
  cache.set(businessId, bundle);
  return bundle;
}

export async function sendDueReminders(
  admin: SupabaseClient
): Promise<ReminderRunResult> {
  const now = Date.now();
  const horizonIso = new Date(now + HORIZON_HOURS * 3_600_000).toISOString();

  const { data, error } = await admin
    .from("appointments")
    .select("id, tenant_id, business_id, contact_id, title, starts_at")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", horizonIso)
    .order("starts_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[reminders] query failed:", error.message);
    return { scanned: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const appts = (data ?? []) as ApptRow[];
  const cache = new Map<string, BizBundle | null>();
  const result: ReminderRunResult = {
    scanned: appts.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const appt of appts) {
    const biz = await loadBizBundle(admin, appt.business_id, cache);
    if (!biz || !biz.enabled) {
      result.skipped++;
      continue;
    }

    // Only send once inside the lead window.
    const startMs = new Date(appt.starts_at).getTime();
    if (startMs > now + biz.leadHours * 3_600_000) continue;

    // No contact phone -> nothing to send; mark done so we don't re-scan.
    let phone: string | null = null;
    if (appt.contact_id) {
      const { data: contact } = await admin
        .from("contacts")
        .select("phone")
        .eq("id", appt.contact_id)
        .eq("tenant_id", appt.tenant_id)
        .maybeSingle();
      phone = (contact?.phone as string | null) ?? null;
    }
    if (!phone) {
      await stamp(admin, appt);
      result.skipped++;
      continue;
    }

    const body = biz.template
      .replaceAll("{business}", biz.name)
      .replaceAll("{time}", formatSlotLabel(new Date(appt.starts_at), biz.timezone));

    const res = await sendCustomerSms(admin, {
      tenantId: appt.tenant_id,
      businessId: appt.business_id,
      contactId: appt.contact_id,
      toPhone: phone,
      body,
      kind: "reminder",
      requireConsent: false, // transactional — they booked with us; STOP still wins
    });

    if (res.sent || res.blocked) {
      // Terminal: delivered, or hard-blocked (STOP / invalid number). Stamp
      // so we never retry or double-charge.
      await stamp(admin, appt);
      if (res.sent) result.sent++;
      else result.skipped++;
    } else {
      // Transient Twilio failure — leave the stamp null to retry next run.
      result.failed++;
    }
  }

  return result;
}

async function stamp(admin: SupabaseClient, appt: ApptRow): Promise<void> {
  await admin
    .from("appointments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", appt.id)
    .eq("tenant_id", appt.tenant_id);
}
