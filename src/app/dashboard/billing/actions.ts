"use server";

import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ALL_LOOKUP_KEYS } from "@/lib/billing/plans";
import { addonLookupKey, isAddonKey, parseAddonLookupKey } from "@/lib/billing/addons";
import { getStripe } from "@/lib/billing/stripe";
import { getSubscription } from "@/lib/billing/subscription";
import { syncSubscription } from "@/lib/billing/sync";
import { TRIAL_DAYS } from "@/lib/billing/trial";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/request";

function billingError(message: string): never {
  redirect(`/dashboard/billing?error=${encodeURIComponent(message)}`);
}

function billingOk(): never {
  redirect(`/dashboard/billing?addon=1`);
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

  // Already subscribed? Switch plans through the Customer Portal instead of
  // stacking a second subscription on the same customer (Stripe Checkout in
  // subscription mode always creates a NEW subscription). Only an entitled,
  // existing subscription routes here; a canceled/stale-plan row still goes
  // through Checkout to start fresh.
  const ENTITLED = new Set(["active", "trialing", "past_due"]);
  if (existing?.stripe_subscription_id && ENTITLED.has(existing.status)) {
    return openBillingPortal();
  }

  // Free trial is granted ONLY on the tenant's first-ever subscription —
  // a prior (even canceled) subscription means they've already had one, so
  // no serial trials.
  const firstTime = !existing?.stripe_subscription_id;

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
      // Require a card even for the trial (gated), and have Stripe cancel
      // rather than silently continue if a card somehow goes missing.
      payment_method_collection: "always",
      subscription_data: {
        metadata: { tenant_id: tenantId },
        ...(firstTime
          ? {
              trial_period_days: TRIAL_DAYS,
              trial_settings: {
                end_behavior: { missing_payment_method: "cancel" as const },
              },
            }
          : {}),
      },
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

/** Adds an add-on as a new subscription item on the tenant's plan. */
export async function addAddon(formData: FormData) {
  const key = String(formData.get("addon_key") ?? "");
  if (!isAddonKey(key)) billingError("Unknown add-on.");

  const { user, active } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") {
    billingError("Only the workspace owner or an admin can manage billing.");
  }
  const tenantId = active.organization_id;

  const sub = await getSubscription(tenantId);
  if (!sub?.stripe_subscription_id) {
    billingError("Choose a plan before adding add-ons.");
  }

  try {
    const stripe = getStripe();
    const prices = await stripe.prices.list({ lookup_keys: [addonLookupKey(key)], limit: 1 });
    const price = prices.data[0];
    if (!price) throw new Error("Add-on price not found — run Stripe setup.");

    const full = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ["items.data.price"],
    });
    const already = full.items.data.find(
      (i) => parseAddonLookupKey(i.price?.lookup_key) === key || i.price?.metadata?.addon === key
    );
    if (!already) {
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: price.id,
        quantity: 1,
        proration_behavior: "create_prorations",
      });
      const refreshed = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
        expand: ["items.data.price"],
      });
      await syncSubscription(createAdminClient(), stripe, refreshed);
    }

    await logAudit({
      tenantId,
      actorUserId: user.id,
      action: "billing.addon_added",
      entityType: "addon",
      entityId: key,
    });
  } catch (err) {
    console.error("[billing] addAddon failed:", err);
    billingError("Could not add that add-on. Try again in a moment.");
  }
  billingOk();
}

/** Removes an add-on subscription item from the tenant's plan. */
export async function removeAddon(formData: FormData) {
  const key = String(formData.get("addon_key") ?? "");
  if (!isAddonKey(key)) billingError("Unknown add-on.");

  const { user, active } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") {
    billingError("Only the workspace owner or an admin can manage billing.");
  }
  const tenantId = active.organization_id;

  const sub = await getSubscription(tenantId);
  if (!sub?.stripe_subscription_id) billingError("No subscription to change.");

  try {
    const stripe = getStripe();
    const full = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ["items.data.price"],
    });
    const item = full.items.data.find(
      (i) => parseAddonLookupKey(i.price?.lookup_key) === key || i.price?.metadata?.addon === key
    );
    if (item) {
      await stripe.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
      const refreshed = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
        expand: ["items.data.price"],
      });
      await syncSubscription(createAdminClient(), stripe, refreshed);
    }

    await logAudit({
      tenantId,
      actorUserId: user.id,
      action: "billing.addon_removed",
      entityType: "addon",
      entityId: key,
    });
  } catch (err) {
    console.error("[billing] removeAddon failed:", err);
    billingError("Could not remove that add-on. Try again in a moment.");
  }
  billingOk();
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
    // Configs created via the API (admin billing-setup) aren't Stripe's
    // dashboard default, so pass one explicitly when it exists.
    const configs = await stripe.billingPortal.configurations.list({
      active: true,
      limit: 1,
    });
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
      configuration: configs.data[0]?.id,
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
      "Could not open the billing portal. (First time? Run Stripe setup on the admin Billing setup page.)"
    );
  }

  redirect(portalUrl);
}
