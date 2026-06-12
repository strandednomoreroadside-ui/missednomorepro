"use server";

import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ALL_LOOKUP_KEYS } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { getSubscription } from "@/lib/billing/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/request";

function billingError(message: string): never {
  redirect(`/dashboard/billing?error=${encodeURIComponent(message)}`);
}

/** Starts a Stripe Checkout session for the selected plan/interval. */
export async function startCheckout(formData: FormData) {
  const lookupKey = String(formData.get("lookup_key") ?? "");
  // Only our known catalog keys — nobody can checkout an arbitrary price.
  if (!ALL_LOOKUP_KEYS.includes(lookupKey)) billingError("Unknown plan selected.");

  const { user, active } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") {
    billingError("Only the workspace owner or an admin can manage billing.");
  }
  const tenantId = active.organization_id;

  const stripe = getStripe();
  const existing = await getSubscription(tenantId);

  let checkoutUrl: string;
  try {
    // Reuse the Stripe customer when we have one; create it otherwise.
    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: active.organizations.name,
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;
      const admin = createAdminClient();
      const { error } = await admin.from("subscriptions").upsert(
        { tenant_id: tenantId, stripe_customer_id: customerId },
        { onConflict: "tenant_id" }
      );
      if (error) throw new Error(error.message);
    }

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const price = prices.data[0];
    if (!price) {
      throw new Error(
        "Plan prices not found in Stripe — run scripts/stripe-setup.mjs."
      );
    }

    const origin = await getOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=1`,
      cancel_url: `${origin}/dashboard/billing?canceled=1`,
      client_reference_id: tenantId,
      subscription_data: { metadata: { tenant_id: tenantId } },
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    checkoutUrl = session.url;

    await logAudit({
      tenantId,
      actorUserId: user.id,
      action: "billing.checkout_started",
      entityType: "checkout_session",
      entityId: session.id,
      metadata: { lookup_key: lookupKey },
    });
  } catch (err) {
    console.error("[billing] checkout failed:", err);
    billingError("Could not start checkout. Try again in a moment.");
  }

  redirect(checkoutUrl);
}

/** Opens the Stripe Customer Portal (plan changes, cards, invoices, cancel). */
export async function openBillingPortal() {
  const { user, active } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") {
    billingError("Only the workspace owner or an admin can manage billing.");
  }
  const tenantId = active.organization_id;

  const sub = await getSubscription(tenantId);
  if (!sub?.stripe_customer_id) {
    billingError("No billing account yet — choose a plan first.");
  }

  let portalUrl: string;
  try {
    const stripe = getStripe();
    const origin = await getOrigin();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    });
    portalUrl = session.url;

    await logAudit({
      tenantId,
      actorUserId: user.id,
      action: "billing.portal_opened",
    });
  } catch (err) {
    console.error("[billing] portal failed:", err);
    billingError(
      "Could not open the billing portal. (First time? Enable the Customer Portal once in Stripe: Settings → Billing → Customer portal → Save.)"
    );
  }

  redirect(portalUrl);
}
