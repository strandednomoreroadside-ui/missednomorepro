import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isKnownPlan, type EffectivePlan } from "@/lib/billing/plans";

export type SubscriptionRow = {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  billing_interval: "month" | "year" | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  overage_enabled: boolean;
  /** Start of the current dunning cycle — set on the first failed renewal
   *  charge, cleared when a charge succeeds. Drives the in-app banner. */
  payment_failed_at: string | null;
};

export type PlanLimits = {
  plan: string;
  monthly_minutes: number;
  simultaneous_calls: number;
  monthly_sms: number;
  monthly_web_conversations: number;
  max_users: number;
  max_locations: number;
  max_workflows: number;
  max_knowledge_sources: number;
  transcript_retention_days: number;
  overage_per_minute_cents: number;
  overage_per_sms_cents: number;
  feature_flags_json: Record<string, boolean>;
};

/** The tenant's subscription row, or null before first checkout. */
export async function getSubscription(
  tenantId: string
): Promise<SubscriptionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load subscription: ${error.message}`);
  return data as SubscriptionRow | null;
}

/** Statuses that still entitle the tenant to their plan's features. */
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

export function effectivePlan(sub: SubscriptionRow | null): EffectivePlan {
  if (!sub || !ENTITLED_STATUSES.has(sub.status)) return "none";
  // Guard against stale/renamed plan ids (e.g. a pre-retier 'revenue' row):
  // an unrecognized plan entitles nothing until the tenant re-subscribes.
  return isKnownPlan(sub.plan) ? sub.plan : "none";
}

/** Limits row for a plan; falls back to the locked-down 'none' row. */
export async function getPlanLimits(plan: EffectivePlan): Promise<PlanLimits> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_limits")
    .select("*")
    .in("plan", [plan, "none"]);
  if (error) throw new Error(`Failed to load plan limits: ${error.message}`);
  const rows = (data ?? []) as PlanLimits[];
  const exact = rows.find((r) => r.plan === plan);
  const fallback = rows.find((r) => r.plan === "none");
  const limits = exact ?? fallback;
  if (!limits) throw new Error("plan_limits is not seeded — run the M3 migration.");
  return limits;
}

/** Feature gate (master plan §7): checks a flag on the tenant's plan. */
export function hasFeature(limits: PlanLimits, flag: string): boolean {
  return limits.feature_flags_json?.[flag] === true;
}
