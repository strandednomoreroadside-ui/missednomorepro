import "server-only";

import type { SubscriptionRow } from "@/lib/billing/subscription";

/**
 * Free-trial policy (operator decision, June 2026): limited + gated.
 *
 *  - Gated: a card is required at checkout (Stripe `payment_method_collection:
 *    'always'`), the trial auto-converts to paid, and it's granted only on a
 *    tenant's FIRST subscription — no serial trials.
 *  - Limited: AI talk-time is hard-capped during the trial regardless of the
 *    plan's generous monthly allotment, so a trial can't burn material voice
 *    COGS (~$0.15/min). When the cap is hit, the voice route forwards the
 *    caller to the owner (the same path as a usage/spend cap) — no surprise
 *    bill, and a nudge to convert.
 */

/** Trial length in days. */
export const TRIAL_DAYS = 7;

/** Hard ceiling on billable AI voice minutes for the whole trial window. */
export const TRIAL_VOICE_MINUTES = 50;

/** Is this subscription currently in its Stripe free trial? */
export function isTrialing(sub: Pick<SubscriptionRow, "status"> | null): boolean {
  return sub?.status === "trialing";
}

/**
 * Trial end date, for display. During a Stripe trial the subscription's
 * current_period_end is the trial end. Null when not trialing / unknown.
 */
export function trialEndsAt(sub: SubscriptionRow | null): Date | null {
  if (!isTrialing(sub) || !sub?.current_period_end) return null;
  return new Date(sub.current_period_end);
}
