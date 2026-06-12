import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  effectivePlan,
  getPlanLimits,
  getSubscription,
  type PlanLimits,
  type SubscriptionRow,
} from "@/lib/billing/subscription";

/** Usage kinds with a plan limit (master plan §6.1, §7). */
export type UsageKind = "voice_minutes" | "sms";

const LIMIT_COLUMN: Record<UsageKind, "monthly_minutes" | "monthly_sms"> = {
  voice_minutes: "monthly_minutes",
  sms: "monthly_sms",
};

/** Start of the usage window: Stripe billing period, else calendar month. */
function periodStart(sub: SubscriptionRow | null): string {
  if (sub?.current_period_start) return sub.current_period_start;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Records a billable event into usage_events. Server-only writes — the
 * caller passes the service-role client (webhooks, voice tools at M7).
 */
export async function recordUsage(
  admin: SupabaseClient,
  event: {
    tenantId: string;
    eventType: UsageKind | (string & {});
    quantity: number;
    unit?: string;
    provider?: string;
    sourceId?: string;
    billable?: boolean;
  }
) {
  const { error } = await admin.from("usage_events").insert({
    tenant_id: event.tenantId,
    event_type: event.eventType,
    quantity: event.quantity,
    unit: event.unit ?? null,
    provider: event.provider ?? null,
    source_id: event.sourceId ?? null,
    billable: event.billable ?? true,
  });
  if (error) throw new Error(`usage_events insert failed: ${error.message}`);
}

export type UsageStatus = {
  kind: UsageKind;
  used: number;
  limit: number;
  remaining: number;
  /** False once the limit is exhausted and overage isn't enabled. */
  allowed: boolean;
};

/**
 * Usage vs the plan limit for the current billing period. Callers that
 * already loaded the subscription/limits pass them to skip refetching.
 */
export async function checkUsageLimit(
  tenantId: string,
  kind: UsageKind,
  preloaded?: { sub: SubscriptionRow | null; limits: PlanLimits }
): Promise<UsageStatus> {
  const sub = preloaded ? preloaded.sub : await getSubscription(tenantId);
  const limits = preloaded ? preloaded.limits : await getPlanLimits(effectivePlan(sub));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usage_events")
    .select("quantity")
    .eq("tenant_id", tenantId)
    .eq("event_type", kind)
    .eq("billable", true)
    .gte("created_at", periodStart(sub));
  if (error) throw new Error(`Failed to load usage: ${error.message}`);

  const used = (data ?? []).reduce((sum, r) => sum + Number(r.quantity), 0);
  const limit = Number(limits[LIMIT_COLUMN[kind]]);
  return {
    kind,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    allowed: used < limit || (sub?.overage_enabled ?? false),
  };
}

/** Both metered usage statuses, for the billing page. */
export async function getUsageSummary(
  tenantId: string,
  preloaded: { sub: SubscriptionRow | null; limits: PlanLimits }
): Promise<UsageStatus[]> {
  return Promise.all([
    checkUsageLimit(tenantId, "voice_minutes", preloaded),
    checkUsageLimit(tenantId, "sms", preloaded),
  ]);
}
