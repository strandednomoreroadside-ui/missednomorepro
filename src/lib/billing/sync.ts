import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { parseLookupKey, PLAN_ORDER, type PlanId } from "@/lib/billing/plans";
import { logAudit } from "@/lib/audit";

/** Statuses that entitle the org to its plan (mirrors subscription.ts). */
const ENTITLED = new Set(["active", "trialing", "past_due"]);

function isoFromUnix(seconds: unknown): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Mirrors a Stripe subscription into our database (subscriptions row +
 * the organization's effective plan). Stripe is the source of truth —
 * this runs only from the signature-verified webhook and server actions.
 */
export async function syncSubscription(
  admin: SupabaseClient,
  stripe: Stripe,
  sub: Stripe.Subscription
) {
  // Find the tenant: subscription metadata first, customer metadata as backup.
  let tenantId = sub.metadata?.tenant_id;
  if (!tenantId && typeof sub.customer === "string") {
    const customer = await stripe.customers.retrieve(sub.customer);
    if (!customer.deleted) tenantId = customer.metadata?.tenant_id;
  }
  if (!tenantId) {
    console.error(`[billing] subscription ${sub.id} has no tenant_id metadata — skipped`);
    return;
  }

  const item = sub.items?.data?.[0];
  let parsed = parseLookupKey(item?.price?.lookup_key);
  if (!parsed) {
    // Fallback: the plan/interval metadata we stamp on every price.
    const metaPlan = item?.price?.metadata?.plan;
    if (metaPlan && (PLAN_ORDER as readonly string[]).includes(metaPlan)) {
      parsed = {
        plan: metaPlan as PlanId,
        interval: item?.price?.metadata?.interval === "year" ? "year" : "month",
      };
    }
  }

  const plan = parsed?.plan ?? "none";
  const interval = parsed?.interval ?? null;

  // Newer Stripe API versions carry the billing period on the item.
  const itemAny = item as unknown as Record<string, unknown> | undefined;
  const subAny = sub as unknown as Record<string, unknown>;
  const periodStart =
    isoFromUnix(itemAny?.current_period_start) ?? isoFromUnix(subAny.current_period_start);
  const periodEnd =
    isoFromUnix(itemAny?.current_period_end) ?? isoFromUnix(subAny.current_period_end);

  const effective = ENTITLED.has(sub.status) ? plan : "none";

  const { error: upsertErr } = await admin.from("subscriptions").upsert(
    {
      tenant_id: tenantId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      plan,
      billing_interval: interval,
      status: sub.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: "tenant_id" }
  );
  if (upsertErr) throw new Error(`subscriptions upsert failed: ${upsertErr.message}`);

  const { error: orgErr } = await admin
    .from("organizations")
    .update({
      plan: effective,
      billing_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    })
    .eq("id", tenantId);
  if (orgErr) throw new Error(`organizations plan update failed: ${orgErr.message}`);

  await logAudit({
    tenantId,
    action: "billing.subscription_synced",
    entityType: "subscription",
    entityId: sub.id,
    metadata: { plan, status: sub.status, interval },
  });
}
