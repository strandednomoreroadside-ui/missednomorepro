import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendStaffSms } from "@/lib/sms/outbound";
import { effectivePlan, type SubscriptionRow } from "@/lib/billing/subscription";
import { emailLayout, sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

/**
 * Usage alerts (master plan §15): notify the business owner once each time
 * their voice-minute or SMS usage crosses 50 / 80 / 100 / 120% of the plan
 * for the billing period. Delivered over BOTH SMS and email (operator
 * decision). Idempotent via the usage_alerts ledger — each threshold fires
 * exactly once per period, so this is safe to call after every call/text.
 *
 * Runs in server contexts only (call-end finalize + the daily cron), so it
 * takes the service-role client.
 */

const THRESHOLDS = [50, 80, 100, 120] as const;

type Kind = "voice_minutes" | "sms";

/** Start of the usage window: Stripe billing period, else calendar month. */
function periodStart(sub: SubscriptionRow | null): string {
  if (sub?.current_period_start) return sub.current_period_start;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** SMS + email destinations for a tenant's owner. */
async function ownerTargets(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string | null,
  forwardNumber: string | null
): Promise<{ phone: string | null; email: string | null }> {
  // Phone: the business forward number, else the first notify-on-lead staff.
  let phone = forwardNumber;
  if (!phone && businessId) {
    const { data } = await admin
      .from("staff_contacts")
      .select("phone")
      .eq("business_id", businessId)
      .eq("notify_on_lead", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    phone = (data as { phone?: string } | null)?.phone ?? null;
  }

  // Email: the organization owner's auth email.
  let email: string | null = null;
  const { data: ownerRow } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", tenantId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const ownerId = (ownerRow as { user_id?: string } | null)?.user_id;
  if (ownerId) {
    const { data } = await admin.auth.admin.getUserById(ownerId);
    email = data.user?.email ?? null;
  }

  return { phone, email };
}

function alertCopy(opts: {
  business: string;
  plan: string;
  kind: Kind;
  threshold: number;
  used: number;
  limit: number;
}): { sms: string; subject: string; html: string } {
  const unit = opts.kind === "voice_minutes" ? "call minutes" : "texts";
  const over = opts.threshold >= 100;
  const tail = over
    ? "New calls now forward to your phone (unless you've turned on overage billing). "
    : "";
  const manage = `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`;

  const sms =
    `${opts.business}: you've used ${opts.threshold}% of your ${opts.plan} plan ${unit} ` +
    `(${opts.used} of ${opts.limit}) this billing period. ${tail}Manage: ${manage}`;

  const subject = `${over ? "⚠️ " : ""}${opts.threshold}% of your ${unit} used — ${opts.business}`;
  const html = emailLayout({
    heading: `You've used ${opts.threshold}% of your ${unit}`,
    bodyHtml:
      `<p>Your <strong>${opts.plan}</strong> plan includes <strong>${opts.limit}</strong> ${unit} ` +
      `per billing period. You've used <strong>${opts.used}</strong> so far.</p>` +
      (over
        ? `<p>To avoid missing calls, new calls now forward to your phone unless you enable overage billing.</p>`
        : "") +
      `<p><a href="${manage}" style="color:#006BFF">Review usage or change your plan →</a></p>`,
  });

  return { sms, subject, html };
}

/** Send any newly-crossed threshold alerts for one usage kind. */
async function alertForKind(
  admin: SupabaseClient,
  ctx: {
    tenantId: string;
    business: string;
    plan: string;
    period: string;
    targets: { phone: string | null; email: string | null };
  },
  kind: Kind,
  used: number,
  limit: number
): Promise<void> {
  if (limit <= 0) return;
  const pct = (used / limit) * 100;

  for (const threshold of THRESHOLDS) {
    if (pct < threshold) continue;

    // Idempotent claim: insert the ledger row first; a conflict means we
    // already sent this threshold this period, so skip.
    const { error: claimErr } = await admin.from("usage_alerts").insert({
      tenant_id: ctx.tenantId,
      kind,
      period_start: ctx.period,
      threshold,
      channel: "sms+email",
    });
    if (claimErr) continue; // unique-violation (already notified) or transient

    const copy = alertCopy({
      business: ctx.business,
      plan: ctx.plan,
      kind,
      threshold,
      used,
      limit,
    });

    if (ctx.targets.phone) {
      await sendStaffSms(admin, {
        tenantId: ctx.tenantId,
        toPhone: ctx.targets.phone,
        body: copy.sms,
      });
    }
    if (ctx.targets.email) {
      await sendEmail({ to: ctx.targets.email, subject: copy.subject, html: copy.html });
    }
  }
}

/**
 * Check usage vs limits for a tenant and fire any crossed-threshold alerts.
 * Cheap: a handful of reads + (at most) one insert/SMS/email per threshold,
 * gated by the idempotency ledger.
 */
export async function checkAndSendUsageAlerts(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  try {
    const { data: subData } = await admin
      .from("subscriptions")
      .select("id, tenant_id, plan, status, overage_enabled, current_period_start, current_period_end")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const sub = (subData as SubscriptionRow | null) ?? null;
    const plan = effectivePlan(sub);
    if (plan === "none") return; // no plan → no allotment to alert on

    const { data: limitRows } = await admin
      .from("plan_limits")
      .select("plan, monthly_minutes, monthly_sms")
      .in("plan", [plan, "none"]);
    const limits =
      (limitRows ?? []).find((r) => r.plan === plan) ??
      (limitRows ?? []).find((r) => r.plan === "none");
    if (!limits) return;

    const period = periodStart(sub);

    // Usage this period, per kind.
    const { data: events } = await admin
      .from("usage_events")
      .select("event_type, quantity")
      .eq("tenant_id", tenantId)
      .eq("billable", true)
      .gte("created_at", period);
    let minutesUsed = 0;
    let smsUsed = 0;
    for (const e of events ?? []) {
      const q = Number((e as { quantity: number }).quantity);
      if ((e as { event_type: string }).event_type === "voice_minutes") minutesUsed += q;
      else if ((e as { event_type: string }).event_type === "sms") smsUsed += q;
    }

    // Business name + the forward number (for the alert SMS target).
    const { data: biz } = await admin
      .from("businesses")
      .select("id, name, forward_number")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const business = (biz as { id: string; name: string; forward_number: string | null } | null) ?? null;

    const targets = await ownerTargets(
      admin,
      tenantId,
      business?.id ?? null,
      business?.forward_number ?? null
    );
    if (!targets.phone && !targets.email) return; // nobody to tell

    const ctx = {
      tenantId,
      business: business?.name ?? "Your business",
      plan,
      period,
      targets,
    };

    await alertForKind(admin, ctx, "voice_minutes", minutesUsed, Number(limits.monthly_minutes));
    await alertForKind(admin, ctx, "sms", smsUsed, Number(limits.monthly_sms));
  } catch (err) {
    // Alerts are best-effort — never let them break a call/text flow.
    console.error("[usage-alerts] check failed:", err);
  }
}

/**
 * Daily sweep over every active tenant — catches SMS-driven thresholds and
 * any tenant who didn't take a call that day. Idempotent per the ledger.
 */
export async function sweepUsageAlerts(admin: SupabaseClient): Promise<number> {
  const { data: subs } = await admin
    .from("subscriptions")
    .select("tenant_id")
    .in("status", ["active", "trialing", "past_due"]);
  const rows = (subs ?? []) as { tenant_id: string }[];
  for (const row of rows) {
    await checkAndSendUsageAlerts(admin, row.tenant_id);
  }
  return rows.length;
}
