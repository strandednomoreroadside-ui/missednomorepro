import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

import { emailLayout, isEmailConfigured, sendEmail } from "./resend";

/** The org owner's auth email, or null. */
async function ownerEmail(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data: ownerRow } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", tenantId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const ownerId = (ownerRow as { user_id?: string } | null)?.user_id;
  if (!ownerId) return null;
  const { data } = await admin.auth.admin.getUserById(ownerId);
  return data.user?.email ?? null;
}

function money(cents: number | null | undefined, currency: string): string {
  const n = (cents ?? 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(n);
}

/**
 * Subscription receipt — fired on Stripe `invoice.paid` (first charge AND
 * renewals). Idempotent because the webhook only processes each event once.
 */
export async function sendSubscriptionReceipt(
  admin: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  if (!isEmailConfigured()) return;
  if ((invoice.amount_paid ?? 0) <= 0) return; // $0 / trial invoice — no receipt

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tenant_id, plan")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  const row = (sub as { tenant_id: string; plan: string } | null) ?? null;
  if (!row) return;

  const to = await ownerEmail(admin, row.tenant_id);
  if (!to) return;

  const amount = money(invoice.amount_paid, invoice.currency ?? "usd");
  const planLabel = row.plan.charAt(0).toUpperCase() + row.plan.slice(1);
  const link = invoice.hosted_invoice_url
    ? `<p><a href="${invoice.hosted_invoice_url}" style="color:#006BFF">View your invoice →</a></p>`
    : "";

  await sendEmail({
    to,
    subject: `Receipt — ${amount} for your ${planLabel} plan`,
    html: emailLayout({
      heading: "Thanks — your payment was received",
      bodyHtml:
        `<p>We've received <strong>${amount}</strong> for your <strong>${planLabel}</strong> plan.</p>` +
        link +
        `<p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/billing" style="color:#006BFF">Manage billing →</a></p>`,
    }),
  });
}

/**
 * One-off customer payment receipt (deposit / invoice / payment link) —
 * fired on `checkout.session.completed` with mode=payment. Emails the payer
 * if Stripe captured their email.
 */
export async function sendPaymentReceipt(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (!isEmailConfigured()) return;
  const to = session.customer_details?.email;
  if (!to) return;

  const amount = money(session.amount_total, session.currency ?? "usd");
  const business = session.metadata?.business_name || "your service provider";

  await sendEmail({
    to,
    subject: `Receipt — ${amount} payment`,
    html: emailLayout({
      heading: "Payment received",
      bodyHtml: `<p>Thanks! We've received your <strong>${amount}</strong> payment to ${business}.</p>`,
    }),
  });
}
