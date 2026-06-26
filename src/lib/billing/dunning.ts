import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logAudit } from "@/lib/audit";
import { emailLayout, sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

/**
 * Failed-payment handling (dunning). Stripe retries a failed renewal on its
 * own schedule and flips the subscription to `past_due` in the meantime; we
 * keep the AI running during that window (past_due is still entitled) but
 * surface it loudly — an email + an in-app banner — so a declined card never
 * silently churns a customer. Cutoff is Stripe's job: after its retries are
 * exhausted it cancels, which flips the org to plan 'none' and locks
 * features the normal way.
 */

/** Days we frame as the grace window in customer-facing copy (informational —
 *  the real retry/cancel cadence is Stripe's). */
export const GRACE_DAYS = 7;

function customerId(invoice: Stripe.Invoice): string | null {
  const c = invoice.customer;
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/** invoice.payment_failed → stamp the dunning start (once) + email the payer. */
export async function handlePaymentFailed(
  admin: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const cust = customerId(invoice);
  if (!cust) return;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tenant_id, payment_failed_at")
    .eq("stripe_customer_id", cust)
    .maybeSingle();
  if (!sub) return;

  // Stamp only the FIRST failure of this cycle, so the grace date is stable
  // across Stripe's multiple retry attempts.
  if (!sub.payment_failed_at) {
    await admin
      .from("subscriptions")
      .update({ payment_failed_at: new Date().toISOString() })
      .eq("tenant_id", sub.tenant_id);
  }

  await logAudit({
    tenantId: sub.tenant_id as string,
    action: "billing.payment_failed",
    entityType: "subscription",
    entityId: invoice.id ?? cust,
    metadata: { attempt: (invoice.attempt_count as number | undefined) ?? null },
  });

  const to = invoice.customer_email ?? "";
  if (!to) return;
  const billingUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`;
  const graceUntil = new Date(Date.now() + GRACE_DAYS * 86_400_000);
  const when = graceUntil.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  await sendEmail({
    to,
    subject: "Action needed: your payment didn't go through",
    html: emailLayout({
      heading: "Your payment didn't go through",
      bodyHtml: `<p style="font-size:14px;line-height:1.5">We couldn't process your latest payment for Missed No More Pro. Your AI receptionist is still running, but please update your card by <strong>${when}</strong> to avoid any interruption to your service.</p>
      <p style="margin:20px 0"><a href="${billingUrl}" style="background:#006BFF;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Update payment method</a></p>
      <p style="font-size:13px;color:#6b7280">If you've already updated your card, you can ignore this email.</p>`,
    }),
  });
}

/** invoice.paid → a charge succeeded; clear the dunning flag (recovery). */
export async function clearPaymentFailed(
  admin: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const cust = customerId(invoice);
  if (!cust) return;
  await admin
    .from("subscriptions")
    .update({ payment_failed_at: null })
    .eq("stripe_customer_id", cust)
    .not("payment_failed_at", "is", null);
}
