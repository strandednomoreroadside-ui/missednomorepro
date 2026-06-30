import "server-only";

/** Customer membership plans (Phase 12, Elite). Shared types + the billing-
 *  interval date math, used by the membership dashboard, the contact page,
 *  and the renewal actions. Queries themselves stay inline at the call sites
 *  (matching the rest of the CRM), so this file is pure + I/O-free. */

export type MembershipInterval = "monthly" | "quarterly" | "yearly";

export const MEMBERSHIP_INTERVALS: MembershipInterval[] = [
  "monthly",
  "quarterly",
  "yearly",
];

export const INTERVAL_MONTHS: Record<MembershipInterval, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export const INTERVAL_LABEL: Record<MembershipInterval, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function isMembershipInterval(v: string): v is MembershipInterval {
  return (MEMBERSHIP_INTERVALS as string[]).includes(v);
}

/**
 * Advance a date by one billing interval, returned as a YYYY-MM-DD string
 * (current_period_end is a DATE column). Day-of-month overflow is clamped to
 * the target month's last day (Jan 31 + 1mo -> Feb 28/29). All in UTC so a
 * plain date never drifts across a timezone boundary.
 */
export function advancePeriodEnd(from: Date, interval: MembershipInterval): string {
  const months = INTERVAL_MONTHS[interval];
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(from.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

/** Next renewal date one interval out from today (UTC), as YYYY-MM-DD. */
export function periodEndFromToday(interval: MembershipInterval): string {
  return advancePeriodEnd(new Date(), interval);
}

export type MembershipPlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: MembershipInterval;
  benefits: string[];
  active: boolean;
  created_at: string;
};

export type CustomerMembershipRow = {
  id: string;
  contact_id: string;
  plan_id: string;
  status: "active" | "paused" | "canceled";
  started_at: string;
  current_period_end: string;
  last_payment_id: string | null;
};
