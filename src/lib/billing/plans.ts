/** Plan catalog — the public pricing tiers (vision pricing, June 2026).
 *
 *  Margin note: voice minutes are the only material COGS (~$0.10–0.13/min).
 *  Included minutes are set to the 70%-safe level; usage past them bills as
 *  metered overage (built in Phase 4). See the approved vision plan. */

// Self-serve tiers (drive Stripe price creation + the pricing cards).
export const PLAN_ORDER = ["starter", "growth", "professional", "elite"] as const;
export type PlanId = (typeof PLAN_ORDER)[number];
// Enterprise is custom (contact sales) — no self-serve Stripe price, but it is
// a valid assigned plan, so it has metadata + a plan_limits row.
export type EffectivePlan = PlanId | "enterprise" | "none";

/** Every plan id the app recognises as an active entitlement. */
export const KNOWN_PLANS: readonly EffectivePlan[] = [...PLAN_ORDER, "enterprise"];

export function isKnownPlan(value: string | null | undefined): value is Exclude<EffectivePlan, "none"> {
  return !!value && (KNOWN_PLANS as readonly string[]).includes(value);
}

export type PlanMeta = {
  name: string;
  monthly: number; // dollars (0 for custom/enterprise)
  previousMonthly?: number; // dollars, shown publicly during the 20% price cut
  annualMonthly: number; // effective $/mo when billed annually
  blurb: string;
  minutes: string;
  highlights: string[];
  popular?: boolean;
  custom?: boolean; // enterprise: "contact sales", no self-serve checkout
};

export const PLAN_META: Record<PlanId | "enterprise", PlanMeta> = {
  starter: {
    name: "Starter",
    monthly: 79,
    previousMonthly: 99,
    annualMonthly: 63.2,
    blurb: "Solo operators who never want to miss a call",
    minutes: "250 AI minutes",
    highlights: [
      "AI receptionist + basic CRM",
      "Booking, cancel & reschedule",
      "Human transfer + Google Calendar",
      "Website chat + AI business insights",
      "Review requests + missed-call recovery",
      "1 user",
    ],
  },
  growth: {
    name: "Growth",
    monthly: 159,
    previousMonthly: 199,
    annualMonthly: 127.2,
    blurb: "Teams that want more leads converted",
    minutes: "500 AI minutes",
    highlights: [
      "Everything in Starter",
      "Lead pipeline + customer timeline",
      "AI follow-ups, reminders & quote intake",
      "Payment requests + analytics dashboard",
      "3 users",
    ],
  },
  professional: {
    name: "Professional",
    monthly: 279,
    previousMonthly: 349,
    annualMonthly: 223.2,
    blurb: "Growing teams that dispatch and need insight",
    minutes: "900 AI minutes",
    highlights: [
      "Everything in Growth",
      "Dispatch board + team calendar",
      "Make & Zapier integrations",
      "10 users",
    ],
    popular: true,
  },
  elite: {
    name: "Elite",
    monthly: 479,
    previousMonthly: 599,
    annualMonthly: 383.2,
    blurb: "Higher-volume teams ready for advanced automation",
    minutes: "1,500 AI minutes",
    highlights: [
      "Everything in Professional",
      "Additional business phone numbers",
      "Membership management",
      "API access + advanced automations",
      "25 users",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthly: 0,
    annualMonthly: 0,
    blurb: "Organizations needing custom volume and support",
    minutes: "Custom minutes",
    highlights: [
      "Custom minutes & pricing",
      "Dedicated onboarding",
      "Custom integrations",
      "Priority support",
    ],
    custom: true,
  },
};

export function lookupKey(plan: PlanId, interval: "month" | "year") {
  return `plan_${plan}_${interval === "year" ? "annual" : "monthly"}`;
}

export const ALL_LOOKUP_KEYS = PLAN_ORDER.flatMap((p) => [
  lookupKey(p, "month"),
  lookupKey(p, "year"),
]);

/** Parses a Stripe price lookup key back into plan + interval. */
export function parseLookupKey(
  key: string | null | undefined
): { plan: PlanId; interval: "month" | "year" } | null {
  if (!key) return null;
  const m = /^plan_(starter|growth|professional|elite)_(monthly|annual)$/.exec(key);
  if (!m) return null;
  return { plan: m[1] as PlanId, interval: m[2] === "annual" ? "year" : "month" };
}
