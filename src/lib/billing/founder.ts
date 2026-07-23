import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logAudit } from "@/lib/audit";
import type { SubscriptionRow } from "@/lib/billing/subscription";

/**
 * Founder offer v2 (July 2026): the first FOUNDER_SLOTS businesses to make a
 * real payment (trial converted, not just started) pay normal plan pricing
 * but get every currently-paid add-on free for as long as their subscription
 * stays continuously active. A full cancellation ends the benefit for good —
 * resubscribing later starts a new, non-continuous subscription.
 *
 * Bumped 5 -> 10 (July 23 2026, operator decision) — see migration
 * 20260723090000_founder_slots_10.sql for the matching DB constraint widen.
 */
export const FOUNDER_SLOTS = 10;

export function isFounderActive(sub: SubscriptionRow | null): boolean {
  return !!sub && sub.founder_slot != null && !sub.founder_lapsed;
}

function customerId(invoice: Stripe.Invoice): string | null {
  const c = invoice.customer;
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/**
 * invoice.paid webhook hook: on a tenant's very first successful charge,
 * claims the next open founder slot (if any remain) unless the tenant is
 * flagged founder_excluded. A no-op on renewals or once all FOUNDER_SLOTS
 * are claimed.
 */
export async function maybeClaimFounderSlot(
  admin: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const cust = customerId(invoice);
  if (!cust) return;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tenant_id, first_payment_at")
    .eq("stripe_customer_id", cust)
    .maybeSingle();
  if (!sub) return;
  if (sub.first_payment_at) return; // not their first charge — nothing to do

  // Atomically stamp the first-payment marker; if a duplicate/concurrent
  // delivery already stamped it, we lose the race harmlessly and stop here.
  const { data: stamped } = await admin
    .from("subscriptions")
    .update({ first_payment_at: new Date().toISOString() })
    .eq("tenant_id", sub.tenant_id)
    .is("first_payment_at", null)
    .select("id")
    .maybeSingle();
  if (!stamped) return;

  const { data: org } = await admin
    .from("organizations")
    .select("founder_excluded")
    .eq("id", sub.tenant_id)
    .maybeSingle();
  if (org?.founder_excluded) return;

  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .not("founder_slot", "is", null);
  const nextSlot = (count ?? 0) + 1;
  if (nextSlot > FOUNDER_SLOTS) return;

  const { error, data: claimed } = await admin
    .from("subscriptions")
    .update({ founder_slot: nextSlot, founder_granted_at: new Date().toISOString() })
    .eq("tenant_id", sub.tenant_id)
    .is("founder_slot", null)
    .select("id")
    .maybeSingle();
  if (error) {
    // 23505 = another request claimed a slot number first (extremely
    // unlikely at this scale) — a safe no-op, not a data problem.
    if (error.code !== "23505") {
      console.error("[billing] founder slot claim failed:", error.message);
    }
    return;
  }
  if (!claimed) return;

  await logAudit({
    tenantId: sub.tenant_id,
    action: "billing.founder_slot_claimed",
    entityType: "subscription",
    entityId: sub.tenant_id,
    metadata: { slot: nextSlot },
  });
}

/**
 * customer.subscription.* sync hook: once a founder's subscription is fully
 * canceled, the benefit ends for good — call with the PRE-upsert state.
 */
export async function maybeLapseFounder(
  admin: SupabaseClient,
  tenantId: string,
  priorFounderSlot: number | null,
  priorFounderLapsed: boolean,
  newStatus: string
): Promise<void> {
  if (priorFounderSlot == null || priorFounderLapsed) return;
  if (newStatus !== "canceled") return;

  await admin.from("subscriptions").update({ founder_lapsed: true }).eq("tenant_id", tenantId);
  await logAudit({
    tenantId,
    action: "billing.founder_lapsed",
    entityType: "subscription",
    entityId: tenantId,
  });
}
