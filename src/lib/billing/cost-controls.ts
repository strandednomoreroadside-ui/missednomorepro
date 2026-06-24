import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { effectivePlan, type SubscriptionRow } from "@/lib/billing/subscription";
import { TRIAL_VOICE_MINUTES, isTrialing } from "@/lib/billing/trial";

/**
 * Cost-control enforcement (master plan §15). Metering already happens at
 * call-end (`src/lib/voice/finalize.ts`); this is the gate that decides
 * whether the AI is allowed to *take* the next call. It runs in the Twilio
 * voice webhook, so every read goes through the passed-in service-role
 * client (no user session there).
 *
 * When this returns `allowed: false`, the voice route forwards the caller
 * to the owner's phone (operator decision) — the AI pauses, no surprise
 * bill, and the call is still answered by a human.
 */

export type VoiceAllowed = {
  allowed: boolean;
  /** Machine-readable reason when blocked, for the call disposition/logs. */
  reason:
    | "minutes_exhausted"
    | "overage_cap"
    | "daily_spend_cap"
    | "trial_cap"
    | null;
};

const ALLOWED: VoiceAllowed = { allowed: true, reason: null };

/** Rough blended $/min — must match finalize.ts COST_PER_MINUTE. */
const COST_PER_MINUTE = 0.15;

/** Start of the usage window: Stripe billing period, else calendar month. */
function periodStart(sub: SubscriptionRow | null): string {
  if (sub?.current_period_start) return sub.current_period_start;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Start of today (UTC) for the daily spend cap. */
function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

type CapRow = {
  daily_spend_cap_cents?: number | null;
  overage_cap_cents?: number | null;
};

/**
 * Decide whether the AI may answer the next call for this tenant. Combines
 * the monthly minute limit, the per-period overage cap, and the per-tenant
 * daily spend cap. A failure to read anything errs OPEN (answers the call)
 * — a cost-control hiccup must never silently drop a customer's calls.
 */
export async function voiceAllowed(
  admin: SupabaseClient,
  tenantId: string
): Promise<VoiceAllowed> {
  try {
    const { data: subData } = await admin
      .from("subscriptions")
      .select(
        "id, tenant_id, plan, status, overage_enabled, current_period_start, current_period_end, daily_spend_cap_cents, overage_cap_cents"
      )
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const sub = (subData as (SubscriptionRow & CapRow) | null) ?? null;
    const plan = effectivePlan(sub);

    const { data: limitRows } = await admin
      .from("plan_limits")
      .select(
        "plan, monthly_minutes, overage_per_minute_cents, daily_spend_cap_cents, overage_cap_cents"
      )
      .in("plan", [plan, "none"]);
    const limits =
      (limitRows ?? []).find((r) => r.plan === plan) ??
      (limitRows ?? []).find((r) => r.plan === "none");
    if (!limits) return ALLOWED; // not seeded — fail open

    // ── Daily spend cap (circuit breaker against runaway/abuse) ──
    const dailyCapCents = sub?.daily_spend_cap_cents ?? limits.daily_spend_cap_cents ?? 0;
    if (dailyCapCents > 0) {
      const { data: todays } = await admin
        .from("calls")
        .select("cost_estimate")
        .eq("tenant_id", tenantId)
        .gte("created_at", startOfTodayUtc());
      const spentCents = Math.round(
        (todays ?? []).reduce((s, r) => s + Number(r.cost_estimate ?? 0), 0) * 100
      );
      if (spentCents >= dailyCapCents) {
        return { allowed: false, reason: "daily_spend_cap" };
      }
    }

    // ── Monthly minutes + overage cap ───────────────────────────
    const { data: usage } = await admin
      .from("usage_events")
      .select("quantity")
      .eq("tenant_id", tenantId)
      .eq("event_type", "voice_minutes")
      .eq("billable", true)
      .gte("created_at", periodStart(sub));
    const minutesUsed = (usage ?? []).reduce((s, r) => s + Number(r.quantity), 0);
    const monthlyMinutes = Number(limits.monthly_minutes ?? 0);

    // During the free trial, a hard talk-time cap overrides the plan's
    // (much larger) allotment and overage is off — a $0 trial must never
    // run up material voice COGS. Hitting it forwards the caller to the owner.
    if (isTrialing(sub)) {
      const trialCap = Math.min(monthlyMinutes || TRIAL_VOICE_MINUTES, TRIAL_VOICE_MINUTES);
      if (minutesUsed >= trialCap) {
        return { allowed: false, reason: "trial_cap" };
      }
      return ALLOWED;
    }

    if (minutesUsed >= monthlyMinutes) {
      if (!sub?.overage_enabled) {
        return { allowed: false, reason: "minutes_exhausted" };
      }
      // Overage is on — allow up to the overage cap, then stop.
      const overageCapCents = sub?.overage_cap_cents ?? limits.overage_cap_cents ?? 0;
      if (overageCapCents > 0) {
        const overMinutes = minutesUsed - monthlyMinutes;
        const overageSpentCents = overMinutes * Number(limits.overage_per_minute_cents ?? 0);
        if (overageSpentCents >= overageCapCents) {
          return { allowed: false, reason: "overage_cap" };
        }
      }
    }

    return ALLOWED;
  } catch (err) {
    console.error("[cost-controls] voiceAllowed failed, erring open:", err);
    return ALLOWED;
  }
}

/** Per-minute blended cost in dollars, exported for reuse. */
export { COST_PER_MINUTE };
