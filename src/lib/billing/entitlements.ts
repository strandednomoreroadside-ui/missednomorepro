import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  addonGrantsFeature,
  effectiveAddonKeys,
  PURCHASABLE_ADDON_ORDER,
  type AddonKey,
} from "@/lib/billing/addons";
import { isFounderActive } from "@/lib/billing/founder";
import {
  effectivePlan,
  getPlanLimits,
  getSubscription,
  hasFeature,
  type PlanLimits,
  type SubscriptionRow,
} from "@/lib/billing/subscription";

/**
 * A tenant's full entitlement picture: plan limits/flags AND active add-ons.
 * A feature is unlocked if the plan grants it OR an active add-on does.
 * Shared by every add-on-gated module (Phase 7+).
 */
export type Entitlements = {
  limits: PlanLimits;
  addons: Set<AddonKey>;
  has: (feature: string) => boolean;
};

/** Load entitlements with an admin/service client (server jobs, webhooks). */
export async function getEntitlementsWith(
  client: SupabaseClient,
  tenantId: string
): Promise<Entitlements> {
  const [{ data: subRow }, { data: addonRows }] = await Promise.all([
    client.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
    client
      .from("tenant_addons")
      .select("addon_key")
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
  ]);

  const plan = effectivePlan((subRow as SubscriptionRow | null) ?? null);
  const { data: limitRows } = await client
    .from("plan_limits")
    .select("*")
    .in("plan", [plan, "none"]);
  const rows = (limitRows ?? []) as PlanLimits[];
  const limits = rows.find((r) => r.plan === plan) ?? rows.find((r) => r.plan === "none");
  if (!limits) throw new Error("plan_limits is not seeded.");

  const purchased = new Set<AddonKey>(
    ((addonRows ?? []) as { addon_key: AddonKey }[]).map((r) => r.addon_key)
  );
  const addons = effectiveAddonKeys(purchased);
  if (isFounderActive(subRow as SubscriptionRow | null)) {
    for (const key of PURCHASABLE_ADDON_ORDER) addons.add(key);
  }

  return {
    limits,
    addons,
    has: (feature: string) => hasFeature(limits, feature) || addonGrantsFeature(addons, feature),
  };
}

/** Load entitlements for the signed-in tenant (RLS-scoped server client). */
export async function getEntitlements(tenantId: string): Promise<Entitlements> {
  const sub = await getSubscription(tenantId);
  const plan = effectivePlan(sub);
  const limits = await getPlanLimits(plan);

  // RLS lets members read their own add-ons.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: addonRows } = await supabase
    .from("tenant_addons")
    .select("addon_key")
    .eq("tenant_id", tenantId)
    .eq("status", "active");
  const purchased = new Set<AddonKey>(
    ((addonRows ?? []) as { addon_key: AddonKey }[]).map((r) => r.addon_key)
  );
  const addons = effectiveAddonKeys(purchased);
  if (isFounderActive(sub)) {
    for (const key of PURCHASABLE_ADDON_ORDER) addons.add(key);
  }

  return {
    limits,
    addons,
    has: (feature: string) => hasFeature(limits, feature) || addonGrantsFeature(addons, feature),
  };
}

/** Outbound follow-up engine gate: Growth's followup_campaigns flag OR the
 *  Outbound Assistant add-on. */
export function outboundEnabled(ent: Entitlements): boolean {
  return ent.has("followup_campaigns") || ent.has("outbound_assistant");
}
