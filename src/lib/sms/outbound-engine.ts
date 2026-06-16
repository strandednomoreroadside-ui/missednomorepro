import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEntitlementsWith, outboundEnabled } from "@/lib/billing/entitlements";
import { sendCustomerSms, type SmsKind } from "@/lib/sms/outbound";

/**
 * AI Follow-Up / Outbound engine (Outbound Assistant add-on). Event-driven:
 * the app enqueues a proactive SMS at the trigger moment (a quote given, a
 * job completed); a daily cron sends what's due.
 *
 * Margin/compliance guardrails live here and in sendCustomerSms:
 *   - each automation is opt-in (enabled=false by default)
 *   - consent required + STOP wins (sendCustomerSms)
 *   - deduped via outbound_queue.dedupe_key
 *   - per-run + per-business send caps
 *   - gated on the Outbound Assistant add-on / Growth followup_campaigns flag
 */

export type AutomationKind = "quote_followup" | "review_request" | "maintenance";

type DelayUnit = "hours" | "days";

export const AUTOMATION_DEFAULTS: Record<
  AutomationKind,
  { label: string; description: string; unit: DelayUnit; delay: number; template: string }
> = {
  quote_followup: {
    label: "Quote follow-up",
    description: "Nudge a caller who got a price but hasn't booked.",
    unit: "hours",
    delay: 24,
    template:
      "Hi {name}, it's {business} following up on your quote. Want us to get you on the schedule? Reply here or give us a call. Reply STOP to opt out.",
  },
  review_request: {
    label: "Review request",
    description: "Ask happy customers for a review after the job.",
    unit: "hours",
    delay: 3,
    template:
      "Thanks for choosing {business}, {name}! If we did a good job, a quick review would mean a lot. Reply STOP to opt out.",
  },
  maintenance: {
    label: "Maintenance reminder",
    description: "Bring past customers back when it's time for service again.",
    unit: "days",
    delay: 90,
    template:
      "Hi {name}, it's been a while since {business} took care of you. Due for service? Reply to get scheduled. Reply STOP to opt out.",
  },
};

export const AUTOMATION_KINDS = Object.keys(AUTOMATION_DEFAULTS) as AutomationKind[];

const KIND_SMS: Record<AutomationKind, SmsKind> = {
  quote_followup: "followup",
  review_request: "review",
  maintenance: "followup",
};

// Per-run safety caps (margin protection).
const MAX_SENDS_PER_RUN = 300;
const MAX_SENDS_PER_BUSINESS = 100;

type AutomationRow = {
  enabled: boolean;
  delay_hours: number | null;
  delay_days: number | null;
  template: string;
};

function render(template: string, vars: { name: string; business: string }): string {
  return template
    .replaceAll("{name}", vars.name || "there")
    .replaceAll("{business}", vars.business || "us");
}

async function loadAutomation(
  admin: SupabaseClient,
  businessId: string,
  kind: AutomationKind
): Promise<AutomationRow | null> {
  const { data } = await admin
    .from("automations")
    .select("enabled, delay_hours, delay_days, template")
    .eq("business_id", businessId)
    .eq("kind", kind)
    .maybeSingle();
  return (data as AutomationRow | null) ?? null;
}

/**
 * Enqueue a proactive follow-up at the trigger moment. No-op when the
 * automation is off or the contact has no phone. Idempotent via dedupeKey.
 */
export async function enqueueFollowup(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId: string;
    contactId: string;
    kind: AutomationKind;
    dedupeKey: string;
  }
): Promise<void> {
  try {
    const auto = await loadAutomation(admin, opts.businessId, opts.kind);
    if (!auto?.enabled) return;

    const def = AUTOMATION_DEFAULTS[opts.kind];
    const delayMs =
      def.unit === "hours"
        ? (auto.delay_hours ?? def.delay) * 3_600_000
        : (auto.delay_days ?? def.delay) * 86_400_000;
    const sendAfter = new Date(Date.now() + delayMs).toISOString();

    const [{ data: contact }, { data: business }] = await Promise.all([
      admin
        .from("contacts")
        .select("name, phone")
        .eq("id", opts.contactId)
        .eq("tenant_id", opts.tenantId)
        .maybeSingle(),
      admin.from("businesses").select("name").eq("id", opts.businessId).maybeSingle(),
    ]);
    if (!contact?.phone) return; // nothing to text

    const body = render(auto.template || def.template, {
      name: (contact.name as string) ?? "",
      business: (business?.name as string) ?? "",
    });

    await admin.from("outbound_queue").upsert(
      {
        tenant_id: opts.tenantId,
        business_id: opts.businessId,
        contact_id: opts.contactId,
        kind: opts.kind,
        body,
        send_after: sendAfter,
        dedupe_key: opts.dedupeKey,
        status: "pending",
      },
      { onConflict: "tenant_id,dedupe_key", ignoreDuplicates: true }
    );
  } catch (err) {
    console.error("[outbound] enqueue failed:", err);
  }
}

export interface OutboundRunResult {
  due: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Send everything that's due. Called by the daily outbound cron. */
export async function processOutboundQueue(
  admin: SupabaseClient
): Promise<OutboundRunResult> {
  const result: OutboundRunResult = { due: 0, sent: 0, skipped: 0, failed: 0 };

  const { data, error } = await admin
    .from("outbound_queue")
    .select("id, tenant_id, business_id, contact_id, kind, body")
    .eq("status", "pending")
    .lte("send_after", new Date().toISOString())
    .order("send_after", { ascending: true })
    .limit(MAX_SENDS_PER_RUN);
  if (error) {
    console.error("[outbound] queue query failed:", error.message);
    return result;
  }

  const rows = data ?? [];
  result.due = rows.length;

  // Batch-load recipient phones for all due rows.
  const contactIds = [...new Set(rows.map((r) => r.contact_id).filter(Boolean))] as string[];
  const phones = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: contacts } = await admin
      .from("contacts")
      .select("id, phone")
      .in("id", contactIds);
    for (const c of contacts ?? []) {
      if (c.phone) phones.set(c.id as string, c.phone as string);
    }
  }

  // Cache per-tenant entitlement; count sends per business this run.
  const entitled = new Map<string, boolean>();
  const perBusiness = new Map<string, number>();

  for (const row of rows) {
    // Entitlement (cached per tenant).
    let ok = entitled.get(row.tenant_id);
    if (ok === undefined) {
      try {
        ok = outboundEnabled(await getEntitlementsWith(admin, row.tenant_id));
      } catch {
        ok = false;
      }
      entitled.set(row.tenant_id, ok);
    }
    if (!ok) {
      await mark(admin, row.id, "skipped", "not_entitled");
      result.skipped++;
      continue;
    }

    // Recipient phone (skip if the contact is gone / has no number).
    const phone = row.contact_id ? phones.get(row.contact_id) : undefined;
    if (!phone) {
      await mark(admin, row.id, "skipped", "no_phone");
      result.skipped++;
      continue;
    }

    // Per-business cap.
    const used = perBusiness.get(row.business_id) ?? 0;
    if (used >= MAX_SENDS_PER_BUSINESS) {
      // Leave pending for the next run.
      continue;
    }

    const res = await sendCustomerSms(admin, {
      tenantId: row.tenant_id,
      businessId: row.business_id,
      contactId: row.contact_id,
      toPhone: phone,
      body: row.body,
      kind: KIND_SMS[row.kind as AutomationKind] ?? "followup",
      requireConsent: true, // proactive/marketing — consent required; STOP wins
    });

    perBusiness.set(row.business_id, used + 1);

    if (res.sent) {
      await mark(admin, row.id, "sent", null);
      result.sent++;
    } else if (res.blocked) {
      await mark(admin, row.id, "skipped", res.reason ?? "blocked");
      result.skipped++;
    } else {
      await mark(admin, row.id, "failed", res.reason ?? "send_failed");
      result.failed++;
    }
  }

  return result;
}

async function mark(
  admin: SupabaseClient,
  id: string,
  status: "sent" | "skipped" | "failed",
  error: string | null
): Promise<void> {
  await admin
    .from("outbound_queue")
    .update({
      status,
      error,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
}
